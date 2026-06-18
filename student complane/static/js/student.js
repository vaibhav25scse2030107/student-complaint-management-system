// =============================================
// STUDENT PORTAL JAVASCRIPT
// =============================================

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('complaintForm');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const submitBtn = document.getElementById('submitBtn');
        const submitText = document.getElementById('submitBtnText');
        const spinner = document.getElementById('submitBtnSpinner');

        // Disable & show spinner
        submitBtn.disabled = true;
        submitText.textContent = 'Submitting...';
        spinner.classList.remove('hidden');

        const data = {
            student_name: document.getElementById('studentName').value.trim(),
            student_id:   document.getElementById('studentId').value.trim(),
            department:   document.getElementById('department').value,
            category:     document.getElementById('category').value,
            priority:     document.getElementById('priority').value,
            complaint_text: document.getElementById('complaintText').value.trim()
        };

        try {
            const res = await fetch('/api/complaints', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (res.ok) {
                showToast('✅ Complaint submitted successfully!', 'success');
                form.reset();
            } else {
                showToast('❌ Failed to submit. Please try again.', 'error');
            }
        } catch (err) {
            console.error(err);
            showToast('❌ Server error. Please check your connection.', 'error');
        } finally {
            submitBtn.disabled = false;
            submitText.textContent = 'Submit Complaint';
            spinner.classList.add('hidden');
        }
    });
});

// Track complaints by student ID
async function trackComplaints() {
    const studentId = document.getElementById('trackId').value.trim();
    const listEl = document.getElementById('myComplaintList');

    if (!studentId) {
        listEl.innerHTML = '<div class="empty-state">Please enter your Student ID.</div>';
        return;
    }

    listEl.innerHTML = '<div class="empty-state">Searching...</div>';

    try {
        const res = await fetch(`/api/complaints/track/${encodeURIComponent(studentId)}`);
        const data = await res.json();

        if (!data.length) {
            listEl.innerHTML = `<div class="empty-state">No complaints found for <strong>${studentId}</strong>.</div>`;
            return;
        }

        listEl.innerHTML = '';
        data.forEach(c => listEl.appendChild(buildCard(c)));
    } catch (err) {
        console.error(err);
        listEl.innerHTML = '<div class="empty-state">Error loading complaints.</div>';
    }
}

// Allow pressing Enter in the search box
document.addEventListener('DOMContentLoaded', () => {
    const trackInput = document.getElementById('trackId');
    if (trackInput) {
        trackInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') trackComplaints();
        });
    }
});

function buildCard(c) {
    const div = document.createElement('div');
    div.className = 'complaint-card';

    const statusClass = c.status === 'Resolved' ? 'resolved'
                      : c.status === 'In Progress' ? 'in-progress'
                      : 'pending';

    const priorityClass = `priority-${c.priority || 'Low'}`;

    div.innerHTML = `
        <div class="card-head">
            <span class="card-name">${escHtml(c.student_name)}</span>
            <div class="tags">
                <span class="tag">${escHtml(c.department)}</span>
                ${c.category ? `<span class="tag">${escHtml(c.category)}</span>` : ''}
            </div>
        </div>
        <div class="card-text">${escHtml(c.complaint_text)}</div>
        <div class="card-footer">
            <div style="display:flex; gap:0.5rem">
                <span class="badge ${statusClass}">${escHtml(c.status)}</span>
                <span class="badge ${priorityClass}">⚡ ${escHtml(c.priority || 'Low')}</span>
            </div>
            <span style="color:var(--text-muted); font-size:0.75rem">${formatDate(c.created_at)}</span>
        </div>
    `;
    return div;
}

function showToast(msg, type) {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.className = `toast ${type}`;
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 4000);
}

function escHtml(str) {
    if (!str) return '';
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function formatDate(d) {
    if (!d) return '';
    return new Date(d).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' });
}
