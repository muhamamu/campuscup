function loadNavbar(currentPage) {
    const navbarContainer = document.getElementById('navbar-container');
    if (!navbarContainer) return;

    const navLinks = [
        { id: 'dashboard', label: 'Dashboard', href: 'index.html' },
        { id: 'teams', label: 'Teams', href: 'teams.html' },
        { id: 'standings', label: 'Standings', href: 'standings.html' },
        { id: 'profile', label: 'Profile', href: 'profile.html' },
        { id: 'admin', label: 'Admin Portal', href: 'admin.html', adminOnly: true }
    ];

    const navLinksHTML = navLinks.map(link => {
        const isActive = link.id === currentPage;
        const activeClass = isActive ? 'bg-white text-[#1a061e]' : 'text-[#fef2f8] hover:text-[#f472b6]';
        const adminClass = link.adminOnly ? 'admin-nav-link hidden' : '';
        
        return `
            <a href="${link.href}" class="${activeClass} ${adminClass} px-4 py-2 rounded-lg font-semibold transition-colors">
                ${link.label}
            </a>
        `;
    }).join('');

    const mobileNavLinksHTML = navLinks.map(link => {
        const isActive = link.id === currentPage;
        const activeClass = isActive ? 'bg-[#f472b6] text-white' : 'text-white hover:bg-[#2d0a33]';
        const adminClass = link.adminOnly ? 'admin-nav-link hidden' : '';
        
        return `
            <a href="${link.href}" class="${activeClass} ${adminClass} block px-4 py-3 rounded-lg font-semibold transition-colors">
                ${link.label}
            </a>
        `;
    }).join('');

    navbarContainer.innerHTML = `
        <nav class="bg-[#1a061e] sticky top-0 z-50 shadow-lg">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="flex items-center justify-between h-20">
                    <!-- Logo -->
                    <div class="flex-shrink-0">
                        <a href="index.html" class="text-2xl font-black text-[#fef2f8] uppercase tracking-tight">
                            CAMPUS <span class="text-[#f472b6]">CUP</span>
                        </a>
                    </div>

                    <!-- Desktop Navigation -->
                    <div class="hidden md:flex items-center space-x-2">
                        ${navLinksHTML}
                    </div>

                    <!-- Desktop Right Side -->
                    <div class="hidden md:flex items-center space-x-4">
                        <button id="theme-toggle" onclick="toggleDarkMode()" class="text-[#fef2f8] hover:text-[#f472b6] p-2 rounded-full transition-colors">
                            <i class="fas fa-cog text-xl"></i>
                        </button>
                        <button class="text-[#fef2f8] hover:text-[#f472b6] p-2 rounded-full transition-colors">
                            <i class="fas fa-bell text-xl"></i>
                        </button>
                        <button onclick="logout()" class="bg-[#f472b6] hover:bg-[#be185d] text-white px-5 py-2 rounded-lg font-semibold transition-colors">
                            <i class="fas fa-sign-out-alt mr-2"></i>Logout
                        </button>
                    </div>

                    <!-- Mobile Menu Button -->
                    <div class="md:hidden">
                        <button id="mobile-menu-btn" onclick="toggleMobileMenu()" class="text-[#fef2f8] hover:text-[#f472b6] p-2">
                            <i class="fas fa-bars text-2xl"></i>
                        </button>
                    </div>
                </div>
            </div>

            <!-- Mobile Menu -->
            <div id="mobile-menu" class="md:hidden hidden bg-[#2d0a33] border-t border-[#f472b6]/20">
                <div class="px-4 py-6 space-y-3">
                    ${mobileNavLinksHTML}
                    <hr class="border-[#f472b6]/20 my-4">
                    <div class="flex items-center justify-between space-x-4">
                        <button id="mobile-theme-toggle" onclick="toggleDarkMode()" class="flex items-center text-[#fef2f8] hover:text-[#f472b6] p-2 rounded-lg transition-colors">
                            <i class="fas fa-cog text-xl mr-2"></i>Theme
                        </button>
                        <button onclick="logout()" class="flex items-center bg-[#f472b6] hover:bg-[#be185d] text-white px-5 py-2 rounded-lg font-semibold transition-colors">
                            <i class="fas fa-sign-out-alt mr-2"></i>Logout
                        </button>
                    </div>
                </div>
            </div>
        </nav>
    `;

    updateAdminLinks();
    updateThemeToggleIcon();
}

function toggleMobileMenu() {
    const menu = document.getElementById('mobile-menu');
    const btn = document.getElementById('mobile-menu-btn');
    
    if (menu) {
        menu.classList.toggle('hidden');
        if (btn) {
            const icon = btn.querySelector('i');
            if (menu.classList.contains('hidden')) {
                icon.className = 'fas fa-bars text-2xl';
            } else {
                icon.className = 'fas fa-times text-2xl';
            }
        }
    }
}

function toggleDarkMode() {
    document.documentElement.classList.toggle('dark-mode');
    const isDark = document.documentElement.classList.contains('dark-mode');
    localStorage.setItem('darkMode', isDark ? 'true' : 'false');
    updateThemeToggleIcon();
}

function updateThemeToggleIcon() {
    const isDark = localStorage.getItem('darkMode') === 'true';
    const desktopToggle = document.getElementById('theme-toggle');
    const mobileToggle = document.getElementById('mobile-theme-toggle');
    
    if (isDark) {
        if (desktopToggle) desktopToggle.innerHTML = '<i class="fas fa-sun text-xl"></i>';
    } else {
        if (desktopToggle) desktopToggle.innerHTML = '<i class="fas fa-moon text-xl"></i>';
    }
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
