from flask import Flask, request, jsonify, render_template, session, redirect, url_for
from pymongo import MongoClient
import certifi
from bson.objectid import ObjectId
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv
from werkzeug.security import generate_password_hash, check_password_hash
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

load_dotenv()

app = Flask(__name__)
app.secret_key = os.environ.get('FLASK_SECRET_KEY', 'default_secret')
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(minutes=30)

limiter = Limiter(
    get_remote_address,
    app=app,
    default_limits=["200 per day", "50 per hour"],
    storage_uri="memory://"
)

# ────────────────────────────────────────────────────────────
# MongoDB Atlas connection
# ────────────────────────────────────────────────────────────
client = MongoClient(os.environ.get('MONGO_URI'), tlsCAFile=certifi.where(), serverSelectionTimeoutMS=5000)
db = client['student_portal']

# Collections
complaints_collection = db['complaints']
faculty_users_collection = db['faculty_users']
settings_collection = db['settings']

# ────────────────────────────────────────────────────────────
# Initialize MongoDB indexes
# ────────────────────────────────────────────────────────────
def init_db():
    try:
        # Ensure unique index on username to prevent duplicates
        faculty_users_collection.create_index('username', unique=True)
        print("MongoDB connected and initialized successfully.")
    except Exception as e:
        print(f"Warning: Could not connect to MongoDB. Make sure your IP is whitelisted in MongoDB Atlas.")

# Run initialization
init_db()

# ── Helper ───────────────────────────────────────────────────
def is_faculty_logged_in():
    return session.get('faculty_logged_in', False)

# ────────────────────────────────────────────────────────────
# LANDING PAGE
# ────────────────────────────────────────────────────────────
@app.route('/')
def index():
    return render_template('index.html')

# ────────────────────────────────────────────────────────────
# STUDENT PORTAL
# ────────────────────────────────────────────────────────────
@app.route('/student')
def student_portal():
    return render_template('student.html')

# ────────────────────────────────────────────────────────────
# FACULTY PORTAL — Login & Dashboard
# ────────────────────────────────────────────────────────────
@app.route('/faculty')
def faculty_portal():
    if not is_faculty_logged_in():
        return redirect(url_for('faculty_login'))
    return render_template('faculty.html', username=session.get('faculty_user', 'Faculty'))

@app.route('/faculty/login', methods=['GET', 'POST'])
@limiter.limit("10 per minute")
def faculty_login():
    if is_faculty_logged_in():
        return redirect(url_for('faculty_portal'))

    error = None
    if request.method == 'POST':
        username = request.form.get('username', '').strip()
        password = request.form.get('password', '').strip()

        # Check credentials from MongoDB
        user = faculty_users_collection.find_one({'username': username})
        if user and check_password_hash(user['password'], password):
            session.permanent = True
            session['faculty_logged_in'] = True
            session['faculty_user'] = user['username']
            return redirect(url_for('faculty_portal'))
        else:
            error = 'Invalid username or password. Please try again.'

    return render_template('faculty_login.html', error=error)

@app.route('/faculty/forgot', methods=['GET', 'POST'])
@limiter.limit("5 per minute")
def faculty_forgot():
    error = None
    credentials = None
    if request.method == 'POST':
        key = request.form.get('recovery_key', '').strip()

        # Get recovery key from MongoDB
        setting = settings_collection.find_one({'key': 'recovery_key'})
        stored_key = setting['value'] if setting else None

        if stored_key and key == stored_key:
            # Fetch all faculty users from MongoDB (include _id and role)
            users = faculty_users_collection.find({})
            credentials = [{
                'id': str(u['_id']),
                'username': u['username'],
                'password': '', # Don't send hashed password
                'role': u.get('role', 'Faculty')
            } for u in users]
        else:
            error = 'Invalid recovery key. Please try again.'
    return render_template('forgot_password.html', error=error, credentials=credentials)

# API — Update faculty credentials
@app.route('/api/faculty/update', methods=['PUT'])
def update_faculty_credentials():
    data = request.json
    user_id = data.get('id')
    new_username = data.get('username', '').strip()
    new_password = data.get('password', '').strip()

    if not user_id or not new_username:
        return jsonify({'success': False, 'error': 'Username is required.'}), 400

    # Check if username already taken by another user
    existing = faculty_users_collection.find_one({'username': new_username, '_id': {'$ne': ObjectId(user_id)}})
    if existing:
        return jsonify({'success': False, 'error': 'Username already taken by another account.'}), 400

    update_data = {'username': new_username}
    if new_password:
        update_data['password'] = generate_password_hash(new_password)

    faculty_users_collection.update_one(
        {'_id': ObjectId(user_id)},
        {'$set': update_data}
    )
    return jsonify({'success': True}), 200

@app.route('/faculty/logout')
def faculty_logout():
    session.clear()
    return redirect(url_for('index'))

# ────────────────────────────────────────────────────────────
# API — Complaints
# ────────────────────────────────────────────────────────────
@app.route('/api/complaints', methods=['POST'])
def add_complaint():
    data = request.json
    new_complaint = {
        'student_name':   data.get('student_name'),
        'student_id':     data.get('student_id'),
        'department':     data.get('department'),
        'category':       data.get('category', ''),
        'complaint_text': data.get('complaint_text'),
        'priority':       data.get('priority', 'Low'),
        'status':         'Pending',
        'created_at':     datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    }
    result = complaints_collection.insert_one(new_complaint)
    new_complaint['_id'] = str(result.inserted_id)
    return jsonify({'success': True, 'complaint': new_complaint}), 201

@app.route('/api/complaints', methods=['GET'])
def get_complaints():
    complaints = []
    for c in complaints_collection.find().sort('created_at', -1):
        c['_id'] = str(c['_id'])
        complaints.append(c)
    return jsonify(complaints), 200

# Track by student ID
@app.route('/api/complaints/track/<student_id>', methods=['GET'])
def track_complaints(student_id):
    complaints = []
    for c in complaints_collection.find({'student_id': student_id}).sort('created_at', -1):
        c['_id'] = str(c['_id'])
        complaints.append(c)
    return jsonify(complaints), 200

@app.route('/api/complaints/<id>', methods=['PUT'])
def update_complaint_status(id):
    data = request.json
    new_status = data.get('status')
    if new_status:
        complaints_collection.update_one(
            {'_id': ObjectId(id)},
            {'$set': {'status': new_status}}
        )
        return jsonify({'success': True}), 200
    return jsonify({'success': False, 'error': 'No status provided'}), 400

@app.route('/api/complaints/<id>', methods=['DELETE'])
def delete_complaint(id):
    complaints_collection.delete_one({'_id': ObjectId(id)})
    return jsonify({'success': True}), 200

if __name__ == '__main__':
    app.run(debug=True, port=5000)

