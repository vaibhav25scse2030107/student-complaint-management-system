document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('complaintForm');
    const refreshBtn = document.getElementById('refreshBtn');
    const complaintList = document.getElementById('complaintList');

    // Fetch complaints on load
    fetchComplaints();

    // Form submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const submitBtn = form.querySelector('.submit-btn');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitting...';

        const data = {
            student_name: document.getElementById('studentName').value,
            student_id: document.getElementById('studentId').value,
            department: document.getElementById('department').value,
            complaint_text: document.getElementById('complaintText').value
        };

        try {
            const res = await fetch('/api/complaints', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            if (res.ok) {
                form.reset();
                fetchComplaints();
            } else {
                alert('Failed to submit complaint');
            }
        } catch (err) {
            console.error(err);
            alert('Error connecting to server');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Submit Complaint';
        }
    });

    // Refresh button
    refreshBtn.addEventListener('click', fetchComplaints);

    async function fetchComplaints() {
        complaintList.innerHTML = '<div class="empty-state">Loading complaints...</div>';
        try {
            const res = await fetch('/api/complaints');
            const data = await res.json();
            
            if (data.length === 0) {
                complaintList.innerHTML = '<div class="empty-state">No complaints found.</div>';
                return;
            }

            complaintList.innerHTML = '';
            data.forEach(complaint => {
                complaintList.appendChild(createComplaintCard(complaint));
            });
        } catch (err) {
            console.error(err);
            complaintList.innerHTML = '<div class="empty-state">Error loading complaints.</div>';
        }
    }

    function createComplaintCard(complaint) {
        const div = document.createElement('div');
        div.className = 'complaint-card';
        
        let statusClass = 'pending';
        if (complaint.status.toLowerCase() === 'resolved') statusClass = 'resolved';
        
        div.innerHTML = `
            <div class="card-header">
                <div class="student-info">${complaint.student_name} <span class="department-tag">${complaint.student_id}</span></div>
                <div class="department-tag">${complaint.department}</div>
            </div>
            <div class="card-body">${complaint.complaint_text}</div>
            <div class="card-footer">
                <span class="badge ${statusClass}">${complaint.status}</span>
                <span style="color: var(--text-muted)">${new Date(complaint.created_at).toLocaleDateString()}</span>
                <div class="actions">
                    <select onchange="updateStatus('${complaint._id}', this.value)">
                        <option value="Pending" ${complaint.status === 'Pending' ? 'selected' : ''}>Pending</option>
                        <option value="In Progress" ${complaint.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
                        <option value="Resolved" ${complaint.status === 'Resolved' ? 'selected' : ''}>Resolved</option>
                    </select>
                    <button onclick="deleteComplaint('${complaint._id}')">Delete</button>
                </div>
            </div>
        `;
        return div;
    }

    window.updateStatus = async (id, status) => {
        try {
            await fetch(`/api/complaints/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status })
            });
            fetchComplaints();
        } catch (err) {
            console.error(err);
            alert('Failed to update status');
        }
    };

    window.deleteComplaint = async (id) => {
        if (!confirm('Are you sure you want to delete this complaint?')) return;
        try {
            await fetch(`/api/complaints/${id}`, {
                method: 'DELETE'
            });
            fetchComplaints();
        } catch (err) {
            console.error(err);
            alert('Failed to delete complaint');
        }
    };
});
