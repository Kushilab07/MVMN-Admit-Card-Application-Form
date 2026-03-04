// ==========================================
// 1. FIREBASE INITIALIZATION & NOTIFICATIONS
// ==========================================
const firebaseConfig = {
    apiKey: "AIzaSyBBkITpfUjxFUFvgQhjnXedrIX4GhfCSCo",
    authDomain: "mvmn-exam-management-system.firebaseapp.com",
    projectId: "mvmn-exam-management-system",
    storageBucket: "mvmn-exam-management-system.firebasestorage.app",
    messagingSenderId: "652018919071",
    appId: "1:652018919071:web:65cd8e632cda4c3f9624aa",
    measurementId: "G-CX06N7M3HX"
};

// Initialize Firebase via global objects provided by Compat script
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

const pageLoadTime = Date.now();
let newAppCount = 0;

// Listen for new records added to 'notifications' AFTER the page loaded
const notificationsRef = db.ref('notifications').orderByChild('timestamp').startAt(pageLoadTime);

notificationsRef.on('child_added', (snapshot) => {
    const data = snapshot.val();
    showToast(`New application submitted by ${data.studentName}`, 'info');
    document.getElementById('notificationBadge').classList.remove('hidden');

    newAppCount++;
    const alertBtn = document.getElementById('newDataAlert');
    const alertText = document.getElementById('newDataText');

    alertText.innerText = `${newAppCount} New Application${newAppCount > 1 ? 's' : ''}`;
    alertBtn.classList.remove('hidden');
});

// Used by the blue floating pill button in HTML
function loadNewData() {
    document.getElementById('newDataAlert').classList.add('hidden');
    document.getElementById('notificationBadge').classList.add('hidden');
    newAppCount = 0;
    fetchData();
}

// ==========================================
// 2. GOOGLE SHEETS DASHBOARD LOGIC
// ==========================================
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxfDAbIcrMrIM7NXBGO35xxmnG2jVKsHBGFNIO-R72O2c-Yc-_Ghi4U7N0JKi-MGXBrBw/exec";

// Initialize UI Icons
lucide.createIcons();

// Theme Toggle
const themeToggleBtn = document.getElementById('theme-toggle');
themeToggleBtn.addEventListener('click', () => {
    const htmlEl = document.documentElement;
    if (htmlEl.classList.contains('dark')) {
        htmlEl.classList.remove('dark');
        localStorage.theme = 'light';
    } else {
        htmlEl.classList.add('dark');
        localStorage.theme = 'dark';
    }
});

// Toast System
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `transform transition-all duration-300 translate-x-full opacity-0 flex items-center p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg border-l-4 pointer-events-auto`;

    let iconName = 'info';
    let iconColorClass = 'text-blue-500';

    if (type === 'success') {
        toast.classList.add('border-l-emerald-500');
        iconName = 'check-circle';
        iconColorClass = 'text-emerald-500';
    } else if (type === 'error') {
        toast.classList.add('border-l-red-500');
        iconName = 'alert-circle';
        iconColorClass = 'text-red-500';
    } else {
        toast.classList.add('border-l-blue-500');
    }

    toast.innerHTML = `<i data-lucide="${iconName}" class="${iconColorClass} mr-3 w-5 h-5 flex-shrink-0"></i><span class="text-sm font-medium text-slate-800 dark:text-slate-200">${message}</span>`;
    container.appendChild(toast);
    lucide.createIcons({ root: toast });

    requestAnimationFrame(() => {
        requestAnimationFrame(() => { toast.classList.remove('translate-x-full', 'opacity-0'); });
    });

    setTimeout(() => {
        toast.classList.add('translate-x-full', 'opacity-0');
        setTimeout(() => { toast.remove(); }, 300);
    }, 3000);
}

// Fetch Data
async function fetchData() {
    const tbody = document.getElementById('tableBody');
    const refreshBtn = document.getElementById('refreshBtn');

    refreshBtn.disabled = true;
    refreshBtn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin text-blue-500"></i> Loading...`;
    lucide.createIcons({ root: refreshBtn });

    try {
        const response = await fetch(SCRIPT_URL);
        const result = await response.json();

        if (result.status === 'success') {
            renderTable(result.data);
            showToast('Applications loaded successfully', 'success');
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        console.error("Fetch Error:", error);
        showToast('Failed to connect to database', 'error');
        tbody.innerHTML = `<tr><td colspan="12" class="px-4 py-8 text-center text-red-500 font-medium">Error loading data. Please check your network.</td></tr>`;
    } finally {
        refreshBtn.disabled = false;
        refreshBtn.innerHTML = `<i data-lucide="refresh-cw" class="w-4 h-4"></i> Refresh`;
        lucide.createIcons({ root: refreshBtn });
    }
}

// Utilities
function escapeHtml(text) {
    if (!text) return '';
    return text.toString().replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function editableCell(value, fieldKey, appId) {
    const safeValue = escapeHtml(value);
    return `
        <td data-field="${fieldKey}" class="px-4 py-3 whitespace-nowrap text-slate-600 dark:text-slate-300 relative group cursor-pointer hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors border-r border-transparent hover:border-blue-200 dark:hover:border-slate-700"
            onclick="enableEdit(this, '${appId}', '${fieldKey}')" data-value="${safeValue}">
            <div class="flex items-center gap-3 justify-between">
                <span class="cell-text">${safeValue}</span>
                <i data-lucide="pencil" class="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-blue-500"></i>
            </div>
        </td>
    `;
}

function renderTable(dataArray) {
    const tbody = document.getElementById('tableBody');
    tbody.innerHTML = '';

    if (!dataArray || dataArray.length === 0) {
        tbody.innerHTML = `<tr><td colspan="12" class="px-4 py-12 text-center text-slate-500 dark:text-slate-400"><i data-lucide="inbox" class="w-8 h-8 mb-2 opacity-50 mx-auto"></i>No pending applications found.</td></tr>`;
        lucide.createIcons();
        return;
    }

    const reversedData = [...dataArray].reverse();

    reversedData.forEach(row => {
        const dateObj = new Date(row.timestamp);
        const timeDay = String(dateObj.getDate()).padStart(2, '0');
        const timeMonth = String(dateObj.getMonth() + 1).padStart(2, '0');
        const timeYear = dateObj.getFullYear();
        const formattedDate = `${timeDay}/${timeMonth}/${timeYear} <span class="text-slate-400 text-xs ml-1">${dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>`;

        const dobObj = new Date(row.dob);
        const dobDay = String(dobObj.getDate()).padStart(2, '0');
        const dobMonth = String(dobObj.getMonth() + 1).padStart(2, '0');
        const dobYear = dobObj.getFullYear();
        const formattedDOB = `${dobDay}/${dobMonth}/${dobYear}`;

        const tr = document.createElement('tr');
        tr.className = "hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors group/row";

        tr.innerHTML = `
            <td class="px-4 py-3 whitespace-nowrap text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900">${formattedDate}</td>
            <td class="px-4 py-3 whitespace-nowrap font-medium text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-900">${row.applicationId}</td>
            ${editableCell(row.studentId, 'studentId', row.applicationId)}
            ${editableCell(row.studentName, 'studentName', row.applicationId)}
            ${editableCell(row.studentClass, 'studentClass', row.applicationId)}
            ${editableCell(row.section, 'section', row.applicationId)}
            ${editableCell(row.rollNo, 'rollNo', row.applicationId)}
            ${editableCell(formattedDOB, 'dob', row.applicationId)}
            ${editableCell(row.fatherName, 'fatherName', row.applicationId)}
            ${editableCell(row.phone, 'phone', row.applicationId)}
            ${editableCell(row.email, 'email', row.applicationId)}
            <td class="px-4 py-3 whitespace-nowrap text-center sticky right-0 z-10 bg-white dark:bg-slate-900 group-hover/row:bg-slate-50 dark:group-hover/row:bg-slate-800 shadow-[-4px_0_10px_rgba(0,0,0,0.04)] border-l border-slate-200 dark:border-slate-800">
                <div class="flex items-center justify-center gap-2">
                    <button onclick="handleAction('${row.applicationId}', 'approve')" class="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white dark:bg-emerald-500/10 dark:hover:bg-emerald-500 dark:hover:text-white transition-all border border-emerald-200 dark:border-emerald-500/20" title="Approve">
                        <i data-lucide="check" class="w-4 h-4"></i>
                    </button>
                    <button onclick="handleAction('${row.applicationId}', 'reject')" class="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-500 hover:text-white dark:bg-red-500/10 dark:hover:bg-red-500 dark:hover:text-white transition-all border border-red-200 dark:border-red-500/20" title="Reject">
                        <i data-lucide="x" class="w-4 h-4"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
    lucide.createIcons();
}

function enableEdit(tdElement, appId, fieldKey) {
    if (tdElement.classList.contains('is-editing')) return;
    tdElement.classList.add('is-editing');
    tdElement.classList.remove('cursor-pointer');

    const currentValue = tdElement.getAttribute('data-value');
    const upperCaseFields = ['studentId', 'studentName', 'section', 'fatherName'];
    const textTransformClass = upperCaseFields.includes(fieldKey) ? 'uppercase' : '';

    tdElement.innerHTML = `
        <div class="flex items-center gap-1 min-w-[140px]" onclick="event.stopPropagation()">
            <input type="text" value="${currentValue}" class="w-full px-2 py-1 text-sm border border-blue-400 dark:border-blue-500 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 shadow-inner ${textTransformClass}">
            <button onclick="saveEdit(this, '${appId}', '${fieldKey}')" class="p-1.5 text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 rounded transition-colors" title="Save">
                <i data-lucide="check" class="w-4 h-4 stroke-[3]"></i>
            </button>
            <button onclick="cancelEdit(this, '${escapeHtml(currentValue)}', '${appId}', '${fieldKey}')" class="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors" title="Cancel">
                <i data-lucide="x" class="w-4 h-4 stroke-[3]"></i>
            </button>
        </div>
    `;
    lucide.createIcons({ root: tdElement });
    const input = tdElement.querySelector('input');
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
}

function cancelEdit(buttonElement, originalValue, appId, fieldKey) {
    const tdElement = buttonElement.closest('td');
    restoreCell(tdElement, originalValue, appId, fieldKey);
}

async function saveEdit(buttonElement, appId, fieldKey) {
    const tdElement = buttonElement.closest('td');
    const input = tdElement.querySelector('input');
    let newValue = input.value.trim();

    const upperCaseFields = ['studentId', 'studentName', 'section', 'fatherName'];
    if (upperCaseFields.includes(fieldKey)) { newValue = newValue.toUpperCase(); }

    input.disabled = true;
    buttonElement.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 spin"></i>`;
    lucide.createIcons({ root: tdElement });

    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'update_cell', appId: appId, field: fieldKey, value: newValue })
        });
        const result = await response.json();

        if (result.status === 'success') {
            showToast(`Updated successfully`, 'success');
            restoreCell(tdElement, newValue, appId, fieldKey);

            if (['studentClass', 'section', 'rollNo'].includes(fieldKey)) {
                const tr = tdElement.closest('tr');
                const classVal = String(tr.querySelector('[data-field="studentClass"]').getAttribute('data-value')).padStart(2, '0');
                const rollVal = String(tr.querySelector('[data-field="rollNo"]').getAttribute('data-value')).padStart(2, '0');
                const sectionVal = String(tr.querySelector('[data-field="section"]').getAttribute('data-value')).toUpperCase();
                const sectionCode = sectionVal === 'MAHA' ? 'M' : sectionVal === 'RISHI' ? 'R' : 'N';
                const yearShort = new Date().getFullYear().toString().slice(-2);
                const newStudentId = `MVMN${classVal}${rollVal}${sectionCode}${yearShort}`;
                
                const studentIdTd = tr.querySelector('[data-field="studentId"]');
                const currentStudentId = studentIdTd.getAttribute('data-value');

                if (newStudentId !== currentStudentId) {
                    restoreCell(studentIdTd, newStudentId, appId, 'studentId');
                    showToast(`Student ID auto-updated to ${newStudentId}`, 'info');

                    fetch(SCRIPT_URL, {
                        method: 'POST',
                        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                        body: JSON.stringify({ action: 'update_cell', appId: appId, field: 'studentId', value: newStudentId })
                    }).catch(err => console.error('Failed to save auto-generated Student ID', err));
                }
            }
        } else {
            throw new Error(result.message);
        }
    } catch (err) {
        showToast('Failed to save edit', 'error');
        restoreCell(tdElement, tdElement.getAttribute('data-value'), appId, fieldKey);
    }
}

function restoreCell(tdElement, value, appId, fieldKey) {
    tdElement.classList.remove('is-editing');
    tdElement.classList.add('cursor-pointer');
    tdElement.setAttribute('data-value', escapeHtml(value));
    tdElement.innerHTML = `
        <div class="flex items-center gap-3 justify-between">
            <span class="cell-text">${escapeHtml(value)}</span>
            <i data-lucide="pencil" class="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-blue-500"></i>
        </div>
    `;
    lucide.createIcons({ root: tdElement });
}

function handleAction(appId, type) {
    if (type === 'approve') { showToast(`Application ${appId} Approved!`, 'success'); } 
    else { showToast(`Application ${appId} Rejected.`, 'error'); }
}

// Auto-load data when the script runs
window.addEventListener('DOMContentLoaded', fetchData);