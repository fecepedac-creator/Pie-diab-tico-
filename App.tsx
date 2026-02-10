
import React, { useState, useEffect } from 'react';
import { UserRole, Patient, Episode, Visit, Alert, ReferralReport, User } from './types.ts';
import { generateId } from './utils.ts';
import Sidebar from './components/Sidebar.tsx';
import Dashboard from './components/Dashboard.tsx';
import PatientList from './components/PatientList.tsx';
import PatientProfile from './components/PatientProfile.tsx';
import EpisodeDetails from './components/EpisodeDetails.tsx';
import WeeklyVisitForm from './components/WeeklyVisitForm.tsx';
import AlertCenter from './components/AlertCenter.tsx';
import RoleSelector from './components/RoleSelector.tsx';
import SurgicalInbox from './components/SurgicalInbox.tsx';
import PresentationView from './components/PresentationView.tsx';
import Login from './components/Login.tsx';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = sessionStorage.getItem('pd_session');
    return saved ? JSON.parse(saved) : null;
  });
  
  const [currentView, setCurrentView] = useState<'dashboard' | 'patients' | 'alerts' | 'profile' | 'episode' | 'new-visit' | 'inbox' | 'presentation'>('dashboard');
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [selectedEpisodeId, setSelectedEpisodeId] = useState<string | null>(null);
  
  // Persistencia (Simulando API Backend)
  const [patients, setPatients] = useState<Patient[]>(() => {
    const saved = localStorage.getItem('pd_patients');
    return saved ? JSON.parse(saved) : [];
  });

  const [episodes, setEpisodes] = useState<Episode[]>(() => {
    const saved = localStorage.getItem('pd_episodes');
    return saved ? JSON.parse(saved) : [];
  });

  const [visits, setVisits] = useState<Visit[]>(() => {
    const saved = localStorage.getItem('pd_visits');
    return saved ? JSON.parse(saved) : [];
  });

  const [referrals, setReferrals] = useState<ReferralReport[]>(() => {
    const saved = localStorage.getItem('pd_referrals');
    return saved ? JSON.parse(saved) : [];
  });

  const [alerts, setAlerts] = useState<Alert[]>([]);

  useEffect(() => {
    localStorage.setItem('pd_patients', JSON.stringify(patients));
    localStorage.setItem('pd_episodes', JSON.stringify(episodes));
    localStorage.setItem('pd_visits', JSON.stringify(visits));
    localStorage.setItem('pd_referrals', JSON.stringify(referrals));
  }, [patients, episodes, visits, referrals]);

  useEffect(() => {
    if (user) {
      sessionStorage.setItem('pd_session', JSON.stringify(user));
    } else {
      sessionStorage.removeItem('pd_session');
    }
  }, [user]);

  useEffect(() => {
    const newAlerts: Alert[] = [];
    const now = new Date();

    if (!episodes || !Array.isArray(episodes)) return;

    episodes.filter(e => e.isActive).forEach(ep => {
      const patient = patients.find(p => p.id === ep.patientId);
      const epVisits = visits.filter(v => v.episodeId === ep.id).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      if (ep.vascularStatus?.abi !== undefined && ep.vascularStatus.abi < 0.5) {
        newAlerts.push({
          id: `isch-${ep.id}`,
          type: 'Surgical',
          severity: 'High',
          message: `VASCULAR: Isquemia Crítica (ABI ${ep.vascularStatus.abi}) en ${patient?.name || 'paciente'}.`,
          episodeId: ep.id,
          patientId: patient?.id,
          createdAt: now.toISOString(),
          isResolved: false
        });
      }

      if (epVisits.length >= 2 && epVisits[0].evolution === 'Peor' && epVisits[1].evolution === 'Peor') {
        newAlerts.push({
          id: `peor-${ep.id}`,
          type: 'Clinical',
          severity: 'High',
          message: `CRÍTICO: 2 evoluciones "Peor" consecutivas en ${patient?.name || 'paciente'}.`,
          episodeId: ep.id,
          patientId: patient?.id,
          createdAt: now.toISOString(),
          isResolved: false
        });
      }
    });

    setAlerts(newAlerts);
  }, [episodes, visits, patients]);

  const handleLogin = (userData: User) => {
    setUser(userData);
    setCurrentView('dashboard');
  };

  const handleLogout = () => {
    setUser(null);
    setCurrentView('dashboard');
  };

  const addReferral = (report: string, epId: string, patId: string) => {
    const newRef: ReferralReport = {
      id: generateId(),
      episodeId: epId,
      patientId: patId,
      date: new Date().toISOString(),
      content: report,
      status: 'Pendiente',
      senderRole: user?.role || UserRole.DOCTOR
    };
    setReferrals(prev => [...prev, newRef]);
    alert('Solicitud enviada a Cirugía.');
  };

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  const selectedEpisode = episodes.find(e => e.id === selectedEpisodeId);
  const selectedPatient = selectedEpisode 
    ? patients.find(p => p.id === selectedEpisode.patientId) 
    : patients.find(p => p.id === selectedPatientId);

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar currentView={currentView} setView={setCurrentView} role={user.role} onLogout={handleLogout} />
      <main className="flex-1 overflow-auto p-4 md:p-8">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Policlínico Pie Diabético</h1>
            <p className="text-slate-500">Unidad de Heridas Complejas - Ecosistema Quirúrgico</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center font-bold">
                {user.name.charAt(0)}
              </div>
              <div className="text-left leading-none">
                <p className="text-sm font-bold text-slate-800">{user.name}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{user.role}</p>
              </div>
            </div>
            {(user.role === UserRole.VASCULAR || user.role === UserRole.SURGERY) && (
              <button 
                onClick={() => setCurrentView('inbox')}
                className="relative bg-white p-2 rounded-lg border border-slate-200 shadow-sm text-slate-600 hover:text-blue-600 transition-colors"
              >
                <i className="fa-solid fa-inbox text-xl"></i>
                {referrals.filter(r => r.status === 'Pendiente').length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                    {referrals.filter(r => r.status === 'Pendiente').length}
                  </span>
                )}
              </button>
            )}
          </div>
        </header>

        {currentView === 'dashboard' && <Dashboard patients={patients} episodes={episodes} visits={visits} alerts={alerts} onNavigateEpisode={(id) => { setSelectedEpisodeId(id); setCurrentView('episode'); }} />}
        {currentView === 'patients' && <PatientList patients={patients} onSelectPatient={(id) => { setSelectedPatientId(id); setCurrentView('profile'); }} onAddPatient={(p) => setPatients(prev => [...prev, p])} role={user.role} />}
        {currentView === 'inbox' && <SurgicalInbox referrals={referrals} onMarkAsRead={(id) => setReferrals(prev => prev.map(r => r.id === id ? {...r, status: 'Revisado'} : r))} onNavigateEpisode={(id) => { setSelectedEpisodeId(id); setCurrentView('episode'); }} />}
        
        {currentView === 'profile' && selectedPatient && (
          <PatientProfile 
            patient={selectedPatient} 
            episodes={episodes.filter(e => e.patientId === selectedPatient.id)} 
            onSelectEpisode={(id) => { setSelectedEpisodeId(id); setCurrentView('episode'); }} 
            onAddEpisode={(e) => setEpisodes(prev => [...prev, e])} 
            role={user.role} 
            onUpdatePatient={(updated) => setPatients(prev => prev.map(p => p.id === updated.id ? updated : p))} 
          />
        )}

        {currentView === 'episode' && selectedEpisode && selectedPatient && (
          <EpisodeDetails 
            episode={selectedEpisode} 
            patient={selectedPatient} 
            visits={visits.filter(v => v.episodeId === selectedEpisode.id)} 
            onNewVisit={() => setCurrentView('new-visit')} 
            onUpdateEpisode={(updated) => setEpisodes(prev => prev.map(e => e.id === updated.id ? updated : e))} 
            role={user.role} 
            onSendReferral={addReferral} 
            onOpenPresentation={() => setCurrentView('presentation')} 
          />
        )}

        {currentView === 'new-visit' && selectedEpisode && (
          <WeeklyVisitForm 
            episodeId={selectedEpisode.id} 
            lastVisit={visits.filter(v => v.episodeId === selectedEpisode.id).pop()} 
            onSubmit={(v) => { setVisits(prev => [...prev, v]); setCurrentView('episode'); }} 
            onCancel={() => setCurrentView('episode')} 
            role={user.role} 
          />
        )}

        {currentView === 'alerts' && <AlertCenter alerts={alerts} onNavigateEpisode={(id) => { setSelectedEpisodeId(id); setCurrentView('episode'); }} />}
        
        {currentView === 'presentation' && selectedEpisode && selectedPatient && (
          <PresentationView 
            patient={selectedPatient}
            episode={selectedEpisode}
            visits={visits.filter(v => v.episodeId === selectedEpisode.id)}
            onClose={() => setCurrentView('episode')}
          />
        )}
      </main>
    </div>
  );
};

export default App;