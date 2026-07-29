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

    // Check localStorage immediately for initial render
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    const userIsAdmin = currentUser && currentUser.isAdmin;

    const navLinksHTML = navLinks.map(link => {
        if (link.adminOnly && !userIsAdmin) return ''; // Skip admin link if not admin
        
        const isActive = link.id === currentPage;
        const activeClass = isActive ? 'text-[#f472b6] font-bold' : 'text-[#fef2f8] hover:text-[#f472b6]';

        return `
            <a href="${link.href}" class="${activeClass} ${link.adminOnly ? 'admin-nav-link' : ''} px-4 py-2 text-sm font-medium transition-colors">
                ${link.label}
            </a>
        `;
    }).join('');

    const mobileNavLinksHTML = navLinks.map(link => {
        if (link.adminOnly && !userIsAdmin) return '';
        
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

    // Still try to update in background, but don't block/hide if it fails
    updateAdminLinks();
}

// ... other functions (toggleMobileMenu, toggleDarkMode, loadTheme) unchanged ...

async function updateAdminLinks() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser) return;

    try {
        const sb = await getSupabase();
        const { data: profile, error } = await sb
            .from('profiles')
            .select('is_admin')
            .eq('id', currentUser.id)
            .single();

        if (error) {
            console.warn('Could not verify admin status with Supabase, using local status.');
            return;
        }

        const isAdmin = profile?.is_admin || false;
        
        // If status changed, update and reload
        if (isAdmin !== currentUser.isAdmin) {
            const updatedUser = { ...currentUser, isAdmin: isAdmin };
            localStorage.setItem('currentUser', JSON.stringify(updatedUser));
            location.reload(); 
        }
    } catch (err) {
        console.error('Supabase connection error:', err);
    }
}

function logout() {
    localStorage.removeItem('currentUser');
    window.location.href = 'login.html';
}