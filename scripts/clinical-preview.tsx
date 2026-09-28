import { createRoot } from 'react-dom/client';
import ProfileDemoDashboard from '../components/ProfileDemoDashboard';
import '../styles.css';
if (!import.meta.env.DEV) throw new Error('Vista disponible únicamente durante desarrollo.');
createRoot(document.getElementById('root')!).render(<ProfileDemoDashboard onClose={() => location.assign('/')} />);
