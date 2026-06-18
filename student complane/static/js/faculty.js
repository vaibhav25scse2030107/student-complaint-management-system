// =============================================
// FACULTY DASHBOARD JAVASCRIPT
// =============================================

let allComplaints = [];
let currentFilter = 'all';

document.addEventListener('DOMContentLoaded', () => {
    loadComplaints();
});

async function loadComplaints() {
    const listEl = document.getElementById('complaintList');
    listEl.innerHTML = '<div class="empty-state">Loading complaints...</div>';

    try {
        const res = await fetch('/api/complaints');
        allComplaints = await res.json();

        updateStats(allComplaints);
        renderComplaints(allComplaints, currentFilter);
    } catch (err) {
        console.error(err);
        listEl.innerHTML = '<div class="empty-state">Error loading complaints.</div>';
    }
}

function renderComplaints(complaints, filter) {
    const listEl = document.getElementById('complaintList');

    let filtered = complaints;
    if (filter !== 'all') {
        filtered = complaints.filter(c => c.status === filter);
    }

    // Apply search
    const searchTerm = document.getElementById('searchInput').value.trim().toLowerCase();
    if (searchTerm) {
        filtered = filtered.filter(c =>
            (c.student_name || '').toLowerCase().includes(searchTerm) ||
            (c.student_id   || '').toLowerCase().includes(searchTerm) ||
            (c.department   || '').toLowerCase().includes(searchTerm) ||
            (c.category     || '').toLowerCase().includes(searchTerm) ||
            (c.complaint_text || '').toLowerCase().includes(searchTerm)
        );
    }

    if (!filtered.length) {
        listEl.innerHTML = '<div class="empty-state">No complaints found.</div>';
        return;
    }

    listEl.innerHTML = '';
    filtered.forEach(c => listEl.appendChild(buildFacultyCard(c)));
}

function buildFacultyCard(c) {
    const div = document.createElement('div');
    div.className = 'complaint-card';
    div.id = `card-${c._id}`;

    const statusClass = c.status === 'Resolved' ? 'resolved'
                      : c.status === 'In Progress' ? 'in-progress'
                      : 'pending';

    const priorityClass = `priority-${c.priority || 'Low'}`;

    div.innerHTML = `
        <div class="card-head">
            <div>
                <span class="card-name">${escHtml(c.student_name)}</span>
                <span style="color:var(--text-muted); font-size:0.78rem; margin-left:0.5rem">${escHtml(c.student_id)}</span>
            </div>
            <div class="tags">
                <span class="tag">${escHtml(c.department)}</span>
                ${c.category ? `<span class="tag">${escHtml(c.category)}</span>` : ''}
            </div>
        </div>
        <div class="card-text">${escHtml(c.complaint_text)}</div>
        <div class="card-footer">
            <div style="display:flex; gap:0.5rem">
                <span class="badge ${statusClass}" id="badge-${c._id}">${escHtml(c.status)}</span>
                <span class="badge ${priorityClass}">⚡ ${escHtml(c.priority || 'Low')}</span>
            </div>
            <span style="color:var(--text-muted)">${formatDate(c.created_at)}</span>
            <div class="faculty-actions">
                <select class="status-select" id="sel-${c._id}" onchange="updateStatus('${c._id}', this.value)">
                    <option value="Pending"     ${c.status === 'Pending'     ? 'selected' : ''}>Pending</option>
                    <option value="In Progress" ${c.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
                    <option value="Resolved"    ${c.status === 'Resolved'    ? 'selected' : ''}>Resolved</option>
                </select>
                <button class="delete-btn" onclick="deleteComplaint('${c._id}')">🗑 Delete</button>
            </div>
        </div>
    `;
    return div;
}

function updateStats(complaints) {
    const total    = complaints.length;
    const pending  = complaints.filter(c => c.status === 'Pending').length;
    const progress = complaints.filter(c => c.status === 'In Progress').length;
    const resolved = complaints.filter(c => c.status === 'Resolved').length;

    document.getElementById('statTotal').textContent    = total;
    document.getElementById('statPending').textContent  = pending;
    document.getElementById('statProgress').textContent = progress;
    document.getElementById('statResolved').textContent = resolved;

    document.getElementById('countPending').textContent  = pending;
    document.getElementById('countProgress').textContent = progress;
    document.getElementById('countResolved').textContent = resolved;
}

function filterComplaints(filter) {
    currentFilter = filter;

    // Update active nav item
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    const navMap = { 'all': 'navAll', 'Pending': 'navPending', 'In Progress': 'navProgress', 'Resolved': 'navResolved' };
    const navEl = document.getElementById(navMap[filter]);
    if (navEl) navEl.classList.add('active');

    renderComplaints(allComplaints, filter);
}

function searchComplaints() {
    renderComplaints(allComplaints, currentFilter);
}

async function updateStatus(id, status) {
    try {
        const res = await fetch(`/api/complaints/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });

        if (res.ok) {
            // Update local data
            const c = allComplaints.find(x => x._id === id);
            if (c) c.status = status;

            // Update badge in DOM without full reload
            const badge = document.getElementById(`badge-${id}`);
            if (badge) {
                badge.textContent = status;
                badge.className = `badge ${status === 'Resolved' ? 'resolved' : status === 'In Progress' ? 'in-progress' : 'pending'}`;
            }

            updateStats(allComplaints);
        }
    } catch (err) {
        console.error(err);
        alert('Failed to update status.');
    }
}

async function deleteComplaint(id) {
    if (!confirm('Are you sure you want to delete this complaint? This cannot be undone.')) return;
    try {
        const res = await fetch(`/api/complaints/${id}`, { method: 'DELETE' });
        if (res.ok) {
            allComplaints = allComplaints.filter(c => c._id !== id);
            const card = document.getElementById(`card-${id}`);
            if (card) card.remove();
            updateStats(allComplaints);
        }
    } catch (err) {
        console.error(err);
        alert('Failed to delete complaint.');
    }
}

function escHtml(str) {
    if (!str) return '';
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function formatDate(d) {
    if (!d) return '';
    return new Date(d).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' });
}
