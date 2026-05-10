function loadNavbar(currentPage) {
    const navbarContainer = document.getElementById('navbar-container');
    if (!navbarContainer) return;

    const navLinks = [
        { id: 'dashboard', label: 'Dashboard', href: 'index.html' },
        { id: 'teams', label: 'Teams', href: 'teams.html' },
        { id: 'standings', label: 'Standings', href: 'standings.html' },
        { id: 'profile', label: 'Profile', href: 'profile.html' },
        { id: 'admin', label: 'Admin', href: 'admin.html', adminOnly: true }
    ];

    const navLinksHTML = navLinks.map(link => {
        const isActive = link.id === currentPage;
        const activeClass = isActive ? 'text-[#f472b6] font-bold' : 'text-[#fef2f8] hover:text-[#f472b6]';
        
        return `
            <a href="${link.href}" class="${activeClass} ${link.adminOnly ? 'admin-nav-link' : ''} px-4 py-2 text-sm font-medium transition-colors">
                ${link.label}
            </a>
        `;
    }).join('');

    const mobileNavLinksHTML = navLinks.map(link => {
        const isActive = link.id === currentPage;
        const activeClass = isActive ? 'text-[#f472b6] font-bold' : 'text-white hover:text-[#f472b6]';
        
        return `
            <a href="${link.href}" class="${activeClass} ${link.adminOnly ? 'admin-nav-link' : ''} block px-4 py-3 text-sm font-medium transition-colors">
                ${link.label}
            </a>
        `;
    }).join('');

    navbarContainer.innerHTML = `
        <nav class="bg-[#1a061e] sticky top-0 z-50 shadow-lg">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="flex items-center justify-between h-16">
                    <div class="flex-shrink-0">
                        <a href="index.html" class="text-xl font-bold text-[#fef2f8] tracking-tight">
                            CAMPUS <span class="text-[#f472b6]">CUP</span>
                        </a>
                    </div>

                    <div class="hidden md:flex items-center space-x-1">
                        ${navLinksHTML}
                    </div>

                    <div class="hidden md:flex items-center space-x-4">
                        <button onclick="logout()" class="text-[#fef2f8] hover:text-[#f472b6] text-sm font-medium transition-colors">
                            Logout
                        </button>
                    </div>

                    <div class="md:hidden">
                        <button id="mobile-menu-btn" onclick="toggleMobileMenu()" class="text-[#fef2f8] hover:text-[#f472b6] p-2">
                            <i class="fas fa-bars text-xl"></i>
                        </button>
                    </div>
                </div>
            </div>

            <div id="mobile-menu" class="md:hidden hidden bg-[#2d0a33] border-t border-[#f472b6]/20">
                <div class="px-4 py-4 space-y-2">
                    ${mobileNavLinksHTML}
                    <hr class="border-[#f472b6]/20 my-4">
                    <button onclick="logout()" class="text-[#fef2f8] hover:text-[#f472b6] text-sm font-medium transition-colors px-4 py-2">
                        Logout
                    </button>
                </div>
            </div>
        </nav>
    `;

    updateAdminLinks();
}

function toggleMobileMenu() {
    const menu = document.getElementById('mobile-menu');
    const btn = document.getElementById('mobile-menu-btn');
    
    if (menu) {
        menu.classList.toggle('hidden');
        if (btn) {
            const icon = btn.querySelector('i');
            if (menu.classList.contains('hidden')) {
                icon.className = 'fas fa-bars text-xl';
            } else {
                icon.className = 'fas fa-times text-xl';
            }
        }
    }
}

function toggleDarkMode() {
    document.documentElement.classList.toggle('dark-mode');
    const isDark = document.documentElement.classList.contains('dark-mode');
    localStorage.setItem('darkMode', isDark ? 'true' : 'false');
}

function loadTheme() {
    const isDark = localStorage.getItem('darkMode') === 'true';
    if (isDark) {
        document.documentElement.classList.add('dark-mode');
    }
}

function updateAdminLinks() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    const adminLinks = document.querySelectorAll('.admin-nav-link');
    
    adminLinks.forEach(link => {
        if (currentUser && currentUser.isAdmin) {
            link.classList.remove('hidden');
        } else {
            link.classList.add('hidden');
        }
    });
}

function logout() {
    localStorage.removeItem('currentUser');
    window.location.href = 'login.html';
}
