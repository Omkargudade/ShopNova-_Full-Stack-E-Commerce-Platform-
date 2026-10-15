document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const authError = document.getElementById('auth-error');

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            try {
                const res = await fetchAPI('/auth/login', 'POST', { email, password });
                localStorage.setItem('jwtToken', res.token);
                localStorage.setItem('userId', res.id);
                localStorage.setItem('userName', res.name);
                localStorage.setItem('role', res.role);
                
                if (window.ShopNovaUI) {
                    ShopNovaUI.showToast('👋 Welcome back!', 'success');
                    ShopNovaUI.playSound('success');
                }
                
                setTimeout(() => {
                    if (res.role === 'ADMIN' || res.role === 'ROLE_ADMIN') {
                        window.location.href = 'admin-dashboard.html';
                    } else {
                        window.location.href = 'index.html';
                    }
                }, 1000);
            } catch (err) {
                if (window.ShopNovaUI) {
                    // API error might already trigger a generic error toast, 
                    // but we will update the authError UI text as well
                    ShopNovaUI.showToast('Invalid credentials', 'error');
                }
                authError.textContent = 'Invalid credentials. Please try again.';
                authError.classList.remove('hidden');
            }
        });
    }

    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('name').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const submitBtn = signupForm.querySelector('button[type="submit"]');

            try {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Signing up...';
                await fetchAPI('/auth/register', 'POST', { name, email, password });
                
                if (window.ShopNovaUI) {
                    ShopNovaUI.showToast('Registration successful! Please login.', 'success');
                    ShopNovaUI.playSound('success');
                } else {
                    alert('Registration successful! Please login.');
                }
                
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 1500);
            } catch (err) {
                if (window.ShopNovaUI) {
                    ShopNovaUI.showToast(err.message || 'Registration failed.', 'error');
                }
                authError.textContent = err.message || 'Registration failed.';
                authError.classList.remove('hidden');
                submitBtn.disabled = false;
                submitBtn.textContent = 'Sign Up';
            }
        });
    }
});
