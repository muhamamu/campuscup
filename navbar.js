let cachedUser = null;

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

    const currentUser = JSON.parse(localStorage.getItem('currentUser'));

    const navLinksHTML = navLinks.map(link => {
        const isActive = link.id === currentPage;
        const activeClass = isActive ? 'text-[#f472b6] font-bold' : 'text-[#fef2f8] hover:text-[#f472b6]';
        // Admin links start hidden unless already known to be admin
        const hiddenClass = (link.adminOnly && (!currentUser || !currentUser.isAdmin)) ? 'hidden' : '';

        return `
            <a href="${link.href}" class="${activeClass} ${link.adminOnly ? 'admin-nav-link' : ''} ${hiddenClass} px-4 py-2 text-sm font-medium transition-colors">
                ${link.label}
            </a>
        `;
    }).join('');

    const mobileNavLinksHTML = navLinks.map(link => {
        const isActive = link.id === currentPage;
        const activeClass = isActive ? 'text-[#f472b6] font-bold' : 'text-white hover:text-[#f472b6]';
        const hiddenClass = (link.adminOnly && (!currentUser || !currentUser.isAdmin)) ? 'hidden' : '';

        return `
            <a href="${link.href}" class="${activeClass} ${link.adminOnly ? 'admin-nav-link' : ''} ${hiddenClass} block px-4 py-3 text-sm font-medium transition-colors">
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

async function updateAdminLinks() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    const adminLinks = document.querySelectorAll('.admin-nav-link');

    if (!currentUser) {
        adminLinks.forEach(link => link.classList.add('hidden'));
        return;
    }

    try {
        const sb = await getSupabase();
        const { data: profile, error } = await sb
            .from('profiles')
            .select('is_admin')
            .eq('id', currentUser.id)
            .single();

        if (error) {
            console.warn('Could not verify admin status with Supabase, using local status.');
            // If we have local admin status, keep it showing
            if (currentUser.isAdmin) {
                adminLinks.forEach(link => link.classList.remove('hidden'));
            }
            return;
        }

        const isAdmin = profile?.is_admin || false;
        
        // Update local storage if status changed
        if (isAdmin !== currentUser.isAdmin) {
            const updatedUser = { ...currentUser, isAdmin: isAdmin };
            localStorage.setItem('currentUser', JSON.stringify(updatedUser));
        }

        // Final visibility toggle
        if (isAdmin) {
            adminLinks.forEach(link => link.classList.remove('hidden'));
        } else {
            adminLinks.forEach(link => link.classList.add('hidden'));
        }
    } catch (err) {
        console.error('Error fetching admin status:', err);
        if (currentUser && currentUser.isAdmin) {
            adminLinks.forEach(link => link.classList.remove('hidden'));
        }
    }
}

function logout() {
    localStorage.removeItem('currentUser');
    window.location.href = 'login.html';
}