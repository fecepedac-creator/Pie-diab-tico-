import React, { useState, useEffect } from 'react';
import { UserRole, Patient, Episode, Visit, Alert, ReferralReport, ClinicalConfig, Center, CenterMembership } from './types.ts';
import { generateId } from './utils.ts';
import { api } from './services/api.ts';
import Sidebar from './components/Sidebar.tsx';
import Dashboard from './components/Dashboard.tsx';
import PatientList from './components/PatientList.tsx';
import PatientProfile from './components/PatientProfile.tsx';
import EpisodeDetails from './components/EpisodeDetails.tsx';
import WeeklyVisitForm from './components/WeeklyVisitForm.tsx';
import AlertCenter from './components/AlertCenter.tsx';
import SurgicalInbox from './components/SurgicalInbox.tsx';
import PresentationView from './components/PresentationView.tsx';
import LoginView from './components/LoginView.tsx';
import AdminSettings from './components/AdminSettings.tsx';
import ParamedicView from './components/ParamedicView.tsx';

const App: React.FC = () => {
  const [authToken, setAuthToken] = useState<string | null>(() => localStorage.getItem('pd_auth_token'));
  const [globalRole, setGlobalRole] = useState<UserRole>(UserRole.ADMIN);
  const [currentUserEmail, setCurrentUserEmail] = useState<string>('');
  const [centers, setCenters] = useState<Center[]>([]);
  const [memberships, setMemberships] = useState<Record<string, CenterMembership>>({});
  const [activeCenterId, setActiveCenterId] = useState<string>(() => localStorage.getItem('pd_active_center_id') || '');
  const [currentView, setCurrentView] = useState<'dashboard' | 'patients' | 'alerts' | 'profile' | 'episode' | 'new-visit' | 'inbox' | 'presentation' | 'settings' | 'camera'>('dashboard');
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [selectedEpisodeId, setSelectedEpisodeId] = useState<string | null>(null);

  const [patients, setPatients] = useState<Patient[]>([]);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [referrals, setReferrals] = useState<ReferralReport[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [clinicalConfig, setClinicalConfig] = useState<ClinicalConfig | null>(null);

  const activeCenter = centers.find(c => c.id === activeCenterId) || null;
  const activeMembership = activeCenterId ? memberships[activeCenterId] : undefined;
  const currentUserRole = (activeMembership?.roles?.[0] || globalRole) as UserRole;
  const activeModules = activeCenter?.modules || [];

  const user = authToken ? { role: currentUserRole, email: currentUserEmail } : null;

  const loadFromLocal = () => {
    try {
      setPatients(JSON.parse(localStorage.getItem('pd_patients') || '[]'));
      setEpisodes(JSON.parse(localStorage.getItem('pd_episodes') || '[]'));
      setVisits(JSON.parse(localStorage.getItem('pd_visits') || '[]'));
      setReferrals(JSON.parse(localStorage.getItem('pd_referrals') || '[]'));
    } catch {
      setPatients([]); setEpisodes([]); setVisits([]); setReferrals([]);
    }
  };

  useEffect(() => {
    const role = localStorage.getItem('pd_auth_role');
    const email = localStorage.getItem('pd_auth_email');
    if (role) setGlobalRole(role as UserRole);
    if (email) setCurrentUserEmail(email);
  }, []);

  useEffect(() => {
    if (!authToken) {
      loadFromLocal();
      return;
    }

    api.getCenters(authToken)
      .then(({ centers: fetchedCenters, memberships: fetchedMemberships }) => {
        setCenters(fetchedCenters as Center[]);
        setMemberships(fetchedMemberships as Record<string, CenterMembership>);
        if (!activeCenterId && fetchedCenters.length > 0) {
          const nextCenterId = fetchedCenters[0].id;
          setActiveCenterId(nextCenterId);
          localStorage.setItem('pd_active_center_id', nextCenterId);
        }
      })
      .catch(() => {
        setCenters([]);
        setMemberships({});
      });
  }, [authToken]);

  useEffect(() => {
    if (!authToken || !activeCenterId) return;

    api.getState(authToken, activeCenterId)
      .then(state => {
        setPatients(state.patients as Patient[]);
        setEpisodes(state.episodes as Episode[]);
        setVisits(state.visits as Visit[]);
        setReferrals(state.referrals as ReferralReport[]);
      })
      .catch(() => loadFromLocal());

    api.getClinicalConfig(authToken, activeCenterId)
      .then(setClinicalConfig)
      .catch(() => setClinicalConfig(null));
  }, [authToken, activeCenterId]);

  useEffect(() => {
    localStorage.setItem('pd_patients', JSON.stringify(patients));
    localStorage.setItem('pd_episodes', JSON.stringify(episodes));
    localStorage.setItem('pd_visits', JSON.stringify(visits));
    localStorage.setItem('pd_referrals', JSON.stringify(referrals));

    if (authToken && activeCenterId) {
      api.saveState(authToken, activeCenterId, { patients, episodes, visits, referrals }).catch(() => { });
    }
  }, [patients, episodes, visits, referrals, authToken, activeCenterId]);

  useEffect(() => {
    const newAlerts: Alert[] = [];
    const now = new Date();

    episodes.filter(e => e.isActive).forEach(ep => {
      const patient = patients.find(p => p.id === ep.patientId);
      const epVisits = visits.filter(v => v.episodeId === ep.id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      if (ep.vascularStatus?.abi !== undefined && ep.vascularStatus.abi < 0.5) {
        newAlerts.push({ id: `isch-${ep.id}`, type: 'Surgical', severity: 'High', message: `VASCULAR: Isquemia Crítica (ABI ${ep.vascularStatus.abi}) en ${patient?.name || 'paciente'}.`, episodeId: ep.id, patientId: patient?.id, createdAt: now.toISOString(), isResolved: false });
      }
      if (epVisits.length >= 2 && epVisits[0].evolution === 'Peor' && epVisits[1].evolution === 'Peor') {
        newAlerts.push({ id: `peor-${ep.id}`, type: 'Clinical', severity: 'High', message: `CRÍTICO: 2 evoluciones "Peor" consecutivas en ${patient?.name || 'paciente'}.`, episodeId: ep.id, patientId: patient?.id, createdAt: now.toISOString(), isResolved: false });
      }
    });

    setAlerts(newAlerts);
  }, [episodes, visits, patients]);

  const handleLogin = async (email: string, password: string) => {
    const { token, user } = await api.login(email, password);
    setAuthToken(token);
    setGlobalRole(user.role as UserRole);
    setCurrentUserEmail(user.email);
    localStorage.setItem('pd_auth_token', token);
    localStorage.setItem('pd_auth_role', user.role);
    localStorage.setItem('pd_auth_email', user.email);
  };

  const handleRegister = async (email: string, password: string, role: UserRole) => {
    await api.register(email, password, role);
  };

  const logout = () => {
    setAuthToken(null);
    setActiveCenterId('');
    setCenters([]);
    setMemberships({});
    localStorage.removeItem('pd_auth_token');
    localStorage.removeItem('pd_auth_role');
    localStorage.removeItem('pd_auth_email');
    localStorage.removeItem('pd_active_center_id');
  };

  const addReferral = (report: string, epId: string, patId: string) => {
    if (!activeCenterId) return;
    const newRef: ReferralReport = {
      id: generateId(),
      episodeId: epId,
      patientId: patId,
      centerId: activeCenterId,
      date: new Date().toISOString(),
      content: report,
      status: 'Pendiente',
      senderRole: user?.role || UserRole.DOCTOR
    };
    setReferrals(prev => [...prev, newRef]);
    alert('Solicitud enviada a Cirugía.');
  };

  const selectedEpisode = episodes.find(e => e.id === selectedEpisodeId);
  const selectedPatient = selectedEpisode
    ? patients.find(p => p.id === selectedEpisode.patientId)
    : patients.find(p => p.id === selectedPatientId);

  const canUseCenter = !!activeCenterId && !!activeMembership?.isActive;

  if (!authToken) {
    return <LoginView onLogin={handleLogin} onRegister={handleRegister} />;
  }

  if (!canUseCenter) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
        <div className="w-full max-w-xl bg-white rounded-2xl shadow-xl p-8 border border-slate-200">
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Selecciona tu centro</h2>
          <p className="text-slate-500 mb-6">Debes elegir un centro activo para continuar.</p>
          <div className="space-y-3">
            {centers.map(center => (
              <button
                key={center.id}
                className="w-full text-left p-4 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50 transition"
                onClick={() => {
                  setActiveCenterId(center.id);
                  localStorage.setItem('pd_active_center_id', center.id);
                }}
              >
                <div className="font-bold text-slate-800">{center.name}</div>
                <div className="text-xs text-slate-500">Roles: {(memberships[center.id]?.roles || []).join(', ') || 'Sin rol'}</div>
              </button>
            ))}
          </div>
          <button onClick={logout} className="mt-6 text-sm text-rose-600 font-bold">Cerrar sesión</button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar currentView={currentView} setView={setCurrentView} role={user.role} modules={activeModules} onLogout={logout} />
      <main className="flex-1 overflow-auto p-4 md:p-8">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Policlínico Pie Diabético</h1>
            <p className="text-slate-500">Unidad de Heridas Complejas - Ecosistema Quirúrgico</p>
          </div>
          <div className="flex items-center gap-4">
            {centers.length > 1 && (
              <select
                className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
                value={activeCenterId}
                onChange={(e) => {
                  setActiveCenterId(e.target.value);
                  localStorage.setItem('pd_active_center_id', e.target.value);
                  setCurrentView('dashboard');
                }}
              >
                {centers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            )}
            <span className="text-xs bg-slate-100 text-slate-700 px-3 py-1 rounded-full font-bold">{currentUserEmail} · {currentUserRole} · {activeCenter?.name}</span>
            {(currentUserRole === UserRole.VASCULAR || currentUserRole === UserRole.SURGERY) && (
              <button onClick={() => setCurrentView('inbox')} className="relative bg-white p-2 rounded-lg border border-slate-200 shadow-sm text-slate-600 hover:text-blue-600 transition-colors">
                <i className="fa-solid fa-inbox text-xl"></i>
                {referrals.filter(r => r.status === 'Pendiente').length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">{referrals.filter(r => r.status === 'Pendiente').length}</span>
                )}
              </button>
            )}
            <button onClick={logout} className="bg-white border border-slate-200 px-3 py-2 rounded-lg text-sm font-bold text-slate-600">Salir</button>
          </div>
        </header>

        {currentView === 'dashboard' && <Dashboard patients={patients} episodes={episodes} visits={visits} alerts={alerts} onNavigateEpisode={(id) => { setSelectedEpisodeId(id); setCurrentView('episode'); }} />}
        {currentView === 'patients' && <PatientList patients={patients} onSelectPatient={(id) => { setSelectedPatientId(id); setCurrentView('profile'); }} onAddPatient={(p) => setPatients(prev => [...prev, p])} role={user.role} activeCenterId={activeCenterId} />}
        {currentView === 'inbox' && <SurgicalInbox referrals={referrals} onMarkAsRead={(id) => setReferrals(prev => prev.map(r => r.id === id ? { ...r, status: 'Revisado' } : r))} onNavigateEpisode={(id) => { setSelectedEpisodeId(id); setCurrentView('episode'); }} />}

        {currentView === 'profile' && selectedPatient && (
          <PatientProfile
            patient={selectedPatient}
            episodes={episodes.filter(e => e.patientId === selectedPatient.id)}
            onSelectEpisode={(id) => { setSelectedEpisodeId(id); setCurrentView('episode'); }}
            onAddEpisode={(e) => setEpisodes(prev => [...prev, e])}
            role={currentUserRole}
            onUpdatePatient={(updated) => setPatients(prev => prev.map(p => p.id === updated.id ? updated : p))}
            activeCenterId={activeCenterId}
          />
        )}

        {currentView === 'episode' && selectedEpisode && selectedPatient && (
          <EpisodeDetails
            episode={selectedEpisode}
            patient={selectedPatient}
            visits={visits.filter(v => v.episodeId === selectedEpisode.id)}
            onNewVisit={() => setCurrentView('new-visit')}
            onUpdateEpisode={(updated) => setEpisodes(prev => prev.map(e => e.id === updated.id ? updated : e))}
            role={currentUserRole}
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
            role={currentUserRole}
            authToken={authToken}
            clinicalConfig={clinicalConfig}
            patient={selectedPatient!}
            onUpdatePatient={(updated) => setPatients(prev => prev.map(p => p.id === updated.id ? updated : p))}
            activeCenterId={activeCenterId}
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

        {currentView === 'settings' && clinicalConfig && authToken && (
          <AdminSettings
            config={clinicalConfig}
            onUpdate={(next) => {
              setClinicalConfig(next);
              api.saveClinicalConfig(authToken, activeCenterId, next).catch(() => { });
            }}
          />
        )}

        {(currentView === 'camera' || (currentView === 'dashboard' && currentUserRole === UserRole.PARAMEDIC)) && (
          <ParamedicView
            patients={patients}
            episodes={episodes}
            onSaveVisit={(v) => { setVisits(prev => [...prev, v]); setCurrentView('dashboard'); }}
            authToken={authToken}
            activeCenterId={activeCenterId}
          />
        )}
      </main>
    </div>
  );
};

export default App;
