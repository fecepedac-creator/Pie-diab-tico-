
const register = async () => {
    try {
        const response = await fetch('http://localhost:4000/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: 'fecepedac@gmail.com',
                password: 'Peda1986',
                role: 'Admin'
            })
        });
        const data = await response.json();
        console.log(data);
    } catch (error) {
        console.error('Error registering user:', error);
    }
};

register();
