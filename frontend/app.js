const API = "https://psi-connect-ten.vercel.app/api";

const state = {
  token: localStorage.getItem('psiconnect.token'),
  user: JSON.parse(localStorage.getItem('psiconnect.user') || 'null'),
  page: 'overview',
  patients: [],
  professionals: [], 
  appointments: [],
  patientQuery: '',
  patientStatus: '',
  month: new Date(),
  editingPatient: null,
  editingProfessional: null,
  editingAppointment: null,
  modalType: null
};

const $ = (selector, root = document) => root.querySelector(selector);
$('#closeModal')?.addEventListener('click', () => {
  $('#modal')?.close();
});

const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, ch => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
})[ch]);

const initials = name =>
  String(name || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0])
    .join('')
    .toUpperCase();

const datePt = value =>
  value
    ? new Date(
        /^\d{4}-\d{2}-\d{2}$/.test(String(value))
          ? `${value}T12:00:00`
          : value
      ).toLocaleDateString('pt-BR')
    : '—';

const isAdmin = () =>
  ['Administrador', 'admin', 'ADMIN'].includes(
    state.user?.perfil || state.user?.role
  );

async function api(path, options = {}) {
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(state.token
        ? { Authorization: `Bearer ${state.token}` }
        : {}),
      ...(options.headers || {})
    }
  });

  const data = await response.json().catch(() => ({}));

  if (response.status === 401 && state.token) {
    logout(false);
  }

  if (!response.ok) {
    throw new Error(
      data.mensagem ||
      data.error ||
      data.detalhe ||
      `Erro HTTP ${response.status}`
    );
  }

  return data;
}

function toast(message) {
  const node = $('#toast');
  if (!node) return;

  node.textContent = message;
  node.classList.add('show');

  setTimeout(() => {
    node.classList.remove('show');
  }, 2800);
}

function showLogin() {
  $('#loginView')?.classList.remove('hidden');
  $('#appView')?.classList.add('hidden');
}

function showApp() {
  if (!state.user || !state.token) {
    return showLogin();
  }

  $('#loginView')?.classList.add('hidden');
  $('#appView')?.classList.remove('hidden');

  const name =
    state.user.nome ||
    state.user.name ||
    state.user.email ||
    'Usuário';

  const userName = $('#userName');
  if (userName) userName.textContent = name;

  const userRole = $('#userRole');
  if (userRole) {
    userRole.textContent =
      state.user.perfil ||
      state.user.role ||
      'Usuário';
  }

  const avatar = $('#avatar');
  if (avatar) avatar.textContent = initials(name);

  document.querySelectorAll('.admin-only').forEach(item => {
    item.classList.toggle('hidden', !isAdmin());
  });

  
  const perfilUsuario = (
  state.user.perfil ||
  state.user.role ||
  ''
).toLowerCase();

const ehPsicologo =
  perfilUsuario === 'psicólogo' ||
  perfilUsuario === 'psicologo';

document.querySelectorAll('.psychologist-only').forEach(item => {
  item.classList.toggle('hidden', !ehPsicologo);
});

if (!ehPsicologo && state.page === 'profile') {
  state.page = 'overview';
}

  if (!isAdmin() && ['team', 'audit'].includes(state.page)) {
    state.page = 'overview';
  }

  renderPage();
}

function logout() {
  state.token = null;
  state.user = null;

  localStorage.removeItem('psiconnect.token');
  localStorage.removeItem('psiconnect.user');

  showLogin();
}

async function loadPatients() {
  try {
    const data = await api('/pacientes');
    state.patients = Array.isArray(data) ? data : (data.pacientes || []);
    
    const countBadge = $('#patientCount');
    if (countBadge) countBadge.textContent = state.patients.length;
    
    if (state.page === 'patients' || state.page === 'overview') {
      renderPage();
    }
  } catch (error) {
    toast(error.message || 'Erro ao carregar pacientes');
  }
}

async function loadAppointments() {
  try {
    const data = await api('/agendamentos');

    state.appointments = Array.isArray(data)
      ? data
      : (data.agendamentos || []);
      console.log('Agendamentos recebidos da API:', data);
      console.log('Agendamentos armazenados:', state.appointments);

    if (state.page === 'appointments' || state.page === 'overview') {
  renderPage();
}
  } catch (error) {
    toast(error.message || 'Erro ao carregar agendamentos');
  }
}

async function loadProfessionals() {
  try {
    const data = await api('/profissionais');

    const professionals = Array.isArray(data)
      ? data
      : (data.profissionais || []);

    state.professionals = professionals.filter(
      professional =>
        String(professional.situacao || 'ativo').toLowerCase() === 'ativo'
    );

  } catch (error) {
  if (error.message !== "Você não tem permissão para acessar este recurso.") {
    toast(error.message || 'Erro ao carregar profissionais.');
  }
}}

function openPatientModal(patient = null) {
  state.editingPatient = patient;
  state.modalType = 'patient';

  const modal = $('#modal');
  $('#closeModal')?.addEventListener('click', () => {
  modal.close();
});
  const eyebrow = $('#modalEyebrow');
  const title = $('#modalTitle');
  const fields = $('#modalFields');

  if (!modal || !fields) return;

  eyebrow.textContent = patient ? 'EDITAR CADASTRO' : 'NOVO CADASTRO';
  title.textContent = patient ? 'Editar paciente' : 'Novo paciente';

  const nascimento = patient?.data_nascimento
    ? String(patient.data_nascimento).slice(0, 10)
    : '';

  fields.innerHTML = `
    <label class="wide">
      Nome completo
      <input
        id="patientName"
        type="text"
        value="${escapeHtml(patient?.nome || '')}"
        required
      >
    </label>

    <label class="wide">
      Contato (telefone ou e-mail)
      <input
        id="patientContact"
        type="text"
        value="${escapeHtml(patient?.contato || '')}"
        required
      >
    </label>

    <label class="wide">
      Data de nascimento
      <input
        id="patientBirth"
        type="date"
        value="${escapeHtml(nascimento)}"
        required
      >
    </label>

    <label class="wide">
      Situação
      <select id="patientStatus" required>
        <option value="ativo" ${
          (patient?.situacao || 'ativo') === 'ativo' ? 'selected' : ''
        }>Ativo</option>

        <option value="inativo" ${
          patient?.situacao === 'inativo' ? 'selected' : ''
        }>Inativo</option>

        <option value="bloqueado" ${
          patient?.situacao === 'bloqueado' ? 'selected' : ''
        }>Bloqueado</option>
      </select>
    </label>

    <label class="wide">
      Dados adicionais (opcional)
      <textarea id="patientAdditional">${escapeHtml(
        patient?.dados_adicionais || ''
      )}</textarea>
    </label>
  `;

  modal.showModal();
}


function openProfessionalModal(profissional = null) {
  const modal = $('#modal');
  const eyebrow = $('#modalEyebrow');
  const title = $('#modalTitle');
  const fields = $('#modalFields');

  if (!modal || !fields) return;

  const ehAtendente = profissional?.tipo === 'atendente';

  state.editingProfessional = profissional;
  state.editingPatient = null;
  state.modalType = 'professional';

  eyebrow.textContent = profissional
    ? 'EDITAR CADASTRO DA EQUIPE'
    : 'CADASTRO DA EQUIPE';

  title.textContent = profissional
    ? (ehAtendente ? 'Editar atendente' : 'Editar psicólogo')
    : 'Novo profissional';

  fields.innerHTML = `
    ${!profissional ? `
      <label class="wide">
        Tipo de acesso
        <select id="professionalType" required>
          <option value="psicologo">Psicólogo</option>
          <option value="atendente">Atendente</option>
        </select>
      </label>
    ` : ''}

    <label class="wide">
      Nome completo
      <input
        id="professionalName"
        type="text"
        value="${escapeHtml(profissional?.nome || '')}"
        required
      >
    </label>

    <label class="wide">
      E-mail
      <input
        id="professionalEmail"
        type="email"
        value="${escapeHtml(profissional?.email || '')}"
        required
      >
    </label>

    ${!profissional ? `
      <label class="wide">
        Senha (mínimo de 8 caracteres)
        <input
          id="professionalPassword"
          type="password"
          minlength="8"
          required
        >
      </label>
    ` : ''}

    <label class="wide" id="registrationField">
      Registro profissional (CRP)
      <input
        id="professionalRegistration"
        type="text"
        value="${escapeHtml(profissional?.registro_profissional || '')}"
      >
    </label>

    <label class="wide" id="areaField">
      Área de atuação
      <input
        id="professionalArea"
        type="text"
        value="${escapeHtml(profissional?.area_atuacao || '')}"
      >
    </label>

    ${profissional ? `
      <label class="wide">
        Situação
        <select id="professionalStatus" required>
          <option value="ativo" ${profissional.situacao === 'ativo' ? 'selected' : ''}>Ativo</option>
          <option value="inativo" ${profissional.situacao === 'inativo' ? 'selected' : ''}>Inativo</option>
          <option value="bloqueado" ${profissional.situacao === 'bloqueado' ? 'selected' : ''}>Bloqueado</option>
        </select>
      </label>
    ` : ''}
  `;

  const tipoSelect = $('#professionalType');

  function atualizarCampos() {
    const ehPsicologo = ehAtendente
      ? false
      : (!tipoSelect || tipoSelect.value === 'psicologo');

    $('#registrationField').style.display = ehPsicologo ? '' : 'none';
    $('#areaField').style.display = ehPsicologo ? '' : 'none';

    $('#professionalRegistration').required = ehPsicologo;
  }

  if (tipoSelect) {
    tipoSelect.addEventListener('change', atualizarCampos);
  }

  atualizarCampos();

  modal.showModal();
}


$('#togglePassword')?.addEventListener('click', () => {
  const input = $('#password');
  if (input) input.type = input.type === 'password' ? 'text' : 'password';
});

$('#loginForm')?.addEventListener('submit', async event => {
  event.preventDefault();

  const errNode = $('#loginError');
  if (errNode) errNode.textContent = '';

  const submit = event.currentTarget.querySelector('[type="submit"]');
  if (submit) submit.disabled = true;

  try {
    const result = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: $('#email').value.trim(),
        senha: $('#password').value
      })
    });

    state.token = result.token;
    state.user = result.usuario || result.user;

    if (!state.token || !state.user) {
      throw new Error('O servidor não retornou o token e os dados do usuário esperados.');
    }

    localStorage.setItem('psiconnect.token', state.token);
    localStorage.setItem('psiconnect.user', JSON.stringify(state.user));

    state.page = 'overview';
    showApp();
    loadPatients();
    loadAppointments();

  } catch (error) {
    if (errNode) errNode.textContent = error.message || 'Não foi possível entrar.';
  } finally {
    if (submit) submit.disabled = false;
  }
});

$('#logout')?.addEventListener('click', logout);

$('#nav')?.addEventListener('click', async event => { 
   const button = event.target.closest('[data-page]');
  if (!button) return;

  state.page = button.dataset.page;

  if (state.page === 'appointments') {
  await loadPatients();
  await loadProfessionals();
  await loadAppointments();
  return;
}

  renderPage();
});

$('#modalForm')?.addEventListener('submit', async event => {
  if (event.submitter?.value === 'cancel') return;

  event.preventDefault();

  try {
    if (state.modalType === 'appointment') {
  const editando = Boolean(state.editingAppointment);

  const data = $('#appointmentDate').value;
  const horario = $('#appointmentTime').value;

  const body = {
    psicologo_id: Number($('#appointmentProfessional').value),
    cliente_paciente_id: Number($('#appointmentPatient').value),
    data_hora_consulta: `${data} ${horario}:00`
  };

  if (editando) {
    await api(`/agendamentos/${state.editingAppointment.id}`, {
      method: 'PUT',
      body: JSON.stringify(body)
    });
  } else {
    await api('/agendamentos', {
      method: 'POST',
      body: JSON.stringify(body)
    });
  }

  $('#modal').close();

  state.modalType = null;
  state.editingAppointment = null;

  toast(editando
    ? 'Agendamento atualizado com sucesso!'
    : 'Agendamento cadastrado com sucesso!');

  await loadAppointments();
  return;
}



if (state.modalType === 'professional') {
  const editando = Boolean(state.editingProfessional);

  const tipo = editando
    ? state.editingProfessional.tipo
    : $('#professionalType').value;

  const body = {
    nome: $('#professionalName').value.trim(),
    email: $('#professionalEmail').value.trim()
  };

  let mensagem;

  if (editando) {
    body.situacao = $('#professionalStatus').value;

    if (tipo === 'atendente') {
      await api(`/usuarios/${state.editingProfessional.id}`, {
        method: 'PATCH',
        body: JSON.stringify(body)
      });

      mensagem = 'Atendente atualizado com sucesso!';
    } else {
      body.registro_profissional =
        $('#professionalRegistration').value.trim();

      body.area_atuacao =
        $('#professionalArea').value.trim();

      await api(`/profissionais/${state.editingProfessional.profissional_id}`, {
        method: 'PUT',
        body: JSON.stringify(body)
      });

      mensagem = 'Psicólogo atualizado com sucesso!';
    }

  } else if (tipo === 'psicologo') {
    body.senha = $('#professionalPassword').value;
    body.registro_profissional =
      $('#professionalRegistration').value.trim();
    body.area_atuacao =
      $('#professionalArea').value.trim();
    body.situacao = 'ativo';

    await api('/profissionais', {
      method: 'POST',
      body: JSON.stringify(body)
    });

    mensagem = 'Psicólogo cadastrado com sucesso!';

  } else if (tipo === 'atendente') {
    body.senha = $('#professionalPassword').value;
    body.perfil_id = 3;
    body.situacao = 'ativo';

    await api('/usuarios', {
      method: 'POST',
      body: JSON.stringify(body)
    });

    mensagem = 'Atendente cadastrado com sucesso!';
  }

  $('#modal').close();

  state.editingProfessional = null;
  state.modalType = null;

  toast(mensagem);
  renderPage();

  return;
}

    const body = {
      nome: $('#patientName').value.trim(),
      contato: $('#patientContact').value.trim(),
      data_nascimento: $('#patientBirth').value,
      situacao: $('#patientStatus').value,
      dados_adicionais: $('#patientAdditional').value.trim()
    };

    if (state.editingPatient) {
      await api(`/pacientes/${state.editingPatient.id}`, {
        method: 'PUT',
        body: JSON.stringify(body)
      });

      toast('Paciente atualizado com sucesso!');
    } else {
      await api('/pacientes', {
        method: 'POST',
        body: JSON.stringify(body)
      });

      toast('Paciente cadastrado com sucesso!');
    }

    $('#modal').close();

    await loadPatients();
    await loadAppointments();

  } catch (error) {
    toast(error.message || 'Erro ao salvar cadastro');
  }
});

const titles = {
  overview: 'Visão geral',
  patients: 'Pacientes',
  appointments: 'Agenda',
  team: 'Profissionais',
  audit: 'Registro de atividades',
  profile: 'Meu Perfil'
};

function pageHeader(title, subtitle, action = '') {
  return `
    <div class="welcome">
      <div>
        <span class="eyebrow">SEU ESPAÇO PROFISSIONAL</span>
        <h1>${title}</h1>
        <p>${subtitle}</p>
      </div>
      ${action}
    </div>
  `;
}

function metric(title, number, note, icon) {
  return `
    <article class="metric">
      <div class="metric-head">
        ${title}
        <span class="metric-icon">${icon}</span>
      </div>
      <div class="metric-value">${number}</div>
      <div class="metric-note">${note}</div>
    </article>
  `;
}

function notReadyPage(title, detail) {
  return `
    <section class="panel">
      <div class="panel-head">
        <div>
          <h3>${title}</h3>
          <small>Esta parte precisa de uma rota correspondente no backend.</small>
        </div>
      </div>
      <div class="empty">
        ${detail}
        <br><br>
        O login e o módulo de pacientes usam as rotas existentes do projeto.
      </div>
    </section>
  `;
}

function renderOverview() {
  const activeCount = state.patients.filter(p =>
    String(p.situacao || p.status || 'ATIVO').toUpperCase() === 'ATIVO'
  ).length;

  const hoje = new Date();
  const hojeKey = [
    hoje.getFullYear(),
    String(hoje.getMonth() + 1).padStart(2, '0'),
    String(hoje.getDate()).padStart(2, '0')
  ].join('-');

  const agendamentos = (state.appointments || [])
    .map(a => {
      const valor = String(a.data_hora_consulta || '');
      const partes = valor.match(
  /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/
);

      if (!partes) return null;

      return {
        ...a,
        dataKey: `${partes[1]}-${partes[2]}-${partes[3]}`,
        horario: `${partes[4]}:${partes[5]}`,
        status: String(a.status_confirmacao || 'pendente').toLowerCase()
      };
    })
    .filter(a => a && a.status !== 'cancelado');

  const sessoesHoje = agendamentos
    .filter(a => a.dataKey === hojeKey)
    .sort((a, b) => a.horario.localeCompare(b.horario));

  const proximasSessoes = agendamentos.filter(
  a => a.dataKey > hojeKey
);

  const listaHoje = sessoesHoje.length
    ? sessoesHoje.map(a => `
        <div class="appointment-item">
          <div>
            <strong>${escapeHtml(a.nome_paciente || 'Paciente')}</strong>
            <small>${escapeHtml(a.nome_psicologo || 'Profissional')}</small>
          </div>
          <span>${escapeHtml(a.horario)}</span>
        </div>
      `).join('')
    : '<div class="empty">Nenhum atendimento agendado para hoje.</div>';

  return `
    ${pageHeader('Visão geral', 'Acompanhe seus atendimentos e rotina do consultório.')}

    <div class="metrics">
      ${metric('Pacientes ativos', activeCount, 'Cadastrados no sistema', '♧')}
      ${metric('Sessões hoje', sessoesHoje.length, 'Agendamentos para hoje', '▦')}
      ${metric('Próximas sessões', proximasSessoes.length, 'Agendamentos futuros', '🗓')}
    </div>

    <div class="content-grid">
      <section class="panel">
        <div class="panel-head">
          <div>
            <h3>Próximos atendimentos</h3>
            <small>Sessões agendadas para hoje</small>
          </div>
        </div>

        ${listaHoje}
      </section>

      <section class="quick-card">
        <h3>Ações rápidas</h3>
        <p>Gerencie seus pacientes e consultas com facilidade.</p>
        <div class="quick-action" id="btnQuickAddPatient">
          <span>+</span> Cadastrar novo paciente
        </div>
      </section>
    </div>
  `;
}

function renderPatients() {
  const filtered = state.patients.filter(p => {
    const busca = state.patientQuery.toLowerCase();

    const matchesQuery =
      !busca ||
      (p.nome || '').toLowerCase().includes(busca) ||
      (p.email || '').toLowerCase().includes(busca) ||
      (p.contato || '').toLowerCase().includes(busca);

    const situacao = String(
      p.situacao || p.status || 'ATIVO'
    ).toUpperCase();

    const matchesStatus =
      !state.patientStatus || situacao === state.patientStatus;

    return matchesQuery && matchesStatus;
  });

  return `
    ${pageHeader(
      'Pacientes',
      'Acompanhe os cadastros e mantenha as informações dos pacientes organizadas.',
      '<button id="btnAddPatient" class="button primary">+ Novo paciente</button>'
    )}

    <section class="panel">
      <div class="panel-head">
        <div>
          <h3>Buscar pacientes</h3>
          <small>Pesquise pelo nome ou contato e filtre pela situação.</small>
        </div>
      </div>

      <div class="toolbar">
        <div class="search">
          <input
            id="searchPatient"
            type="text"
            placeholder="Buscar paciente..."
            value="${escapeHtml(state.patientQuery)}"
          >
        </div>

        <select id="filterStatus">
          <option value="">Todas as situações</option>
          <option value="ATIVO" ${state.patientStatus === 'ATIVO' ? 'selected' : ''}>Ativos</option>
          <option value="INATIVO" ${state.patientStatus === 'INATIVO' ? 'selected' : ''}>Inativos</option>
          <option value="BLOQUEADO" ${state.patientStatus === 'BLOQUEADO' ? 'selected' : ''}>Bloqueados</option>
        </select>
      </div>
    </section>

    <section class="patients-section">
      <div class="patients-section-header">
        <div>
          <h3>Seus pacientes</h3>
          <small>${filtered.length} de ${state.patients.length} paciente(s)</small>
        </div>
      </div>

      ${
        filtered.length === 0
          ? '<div class="empty">Nenhum paciente encontrado.</div>'
          : `
            <div class="patients-grid">
              ${filtered.map(p => {
                const situacao = String(
                  p.situacao || p.status || 'ATIVO'
                ).toUpperCase();

                const statusLabel = ({
                  ATIVO: 'Ativo',
                  INATIVO: 'Inativo',
                  BLOQUEADO: 'Bloqueado'
                })[situacao] || 'Indefinido';

                return `
                  <article class="patient-card">
                    <div class="patient-card-top">
                      <div class="person-avatar">
                        ${escapeHtml(initials(p.nome))}
                      </div>

                      <span class="status-pill ${situacao}">
                        ${statusLabel}
                      </span>
                    </div>

                    <div class="patient-card-info">
                      <h4>${escapeHtml(p.nome)}</h4>
                      <p>${escapeHtml(p.contato || 'Contato não informado')}</p>
                    </div>

                    <div class="patient-card-detail">
                      <span>Data de nascimento</span>
                      <strong>${escapeHtml(
                        p.data_nascimento
                          ? String(p.data_nascimento).slice(0, 10).split('-').reverse().join('/')
                          : 'Não informada'
                      )}</strong>
                    </div>

                    <div class="patient-card-actions">
                      <button
                        type="button"
                        data-action="edit"
                        data-id="${p.id}"
                      >
                        Editar cadastro
                      </button>
                    </div>
                  </article>
                `;
              }).join('')}
            </div>
          `
      }
    </section>
  `;
}

function renderAppointments() {
  const appointments = state.appointments || [];
console.log('Data e horário recebidos do servidor:', state.appointments);

  console.log('Pacientes:', state.patients);
  console.log('Profissionais:', state.professionals);

  return `
    
  ${pageHeader(
    'Agenda',
    'Gerencie seus horários e consultas.',
    (isAdmin() || state.user?.role === 'Atendente')
      ? '<button id="btnAddAppointment" class="button primary" type="button">+ Novo agendamento</button>'
      : ''
  )}


    <section class="panel">
      <div class="panel-head">
        <div>
          <h3>Agendamentos</h3>
          <small>${appointments.length} consulta(s) cadastrada(s)</small>
        </div>
      </div>

      ${
        appointments.length === 0
          ? '<div class="empty">Nenhum agendamento encontrado.</div>'
          : `
            <div class="table-wrap">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Paciente</th>
                    <th>Psicólogo</th>
                    <th>Data</th>
                    <th>Horário</th>
                    <th>Status</th>
                    <th>Ações</th>
                  </tr>
                </thead>

                <tbody>
                  ${appointments.map(a => {
                    const status = String(
                      a.status_confirmacao || 'pendente'
                    ).toLowerCase();

                    const valor = String(a.data_hora_consulta || '');

                     const partes = valor.match(
                  /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/
                );

                    const dataFormatada = partes
                      ? `${partes[3]}/${partes[2]}/${partes[1]}`
                      : '—';

                    const horarioFormatado = partes
                      ? `${partes[4]}:${partes[5]}`
                      : '—';

                    return `
                      <tr>
                        <td>${escapeHtml(a.nome_paciente || '—')}</td>
                        <td>${escapeHtml(a.nome_psicologo || '—')}</td>
                        <td>${escapeHtml(dataFormatada)}</td>
                        <td>${escapeHtml(horarioFormatado)}</td>
                        <td>
                          <span class="status-pill ${escapeHtml(status.toUpperCase())}">
                            ${escapeHtml(status)}
                          </span>
                        </td>
                                              <td class="table-actions">
                        <button data-action="edit-appointment" data-id="${a.id}">
                          Editar
                        </button>

                      <button data-action="delete-appointment" data-id="${a.id}">
  Excluir
</button>

                        ${
                          status === 'pendente'
                            ? `
                              <button data-action="confirm" data-id="${a.id}">
                                Confirmar
                              </button>
                              <button data-action="cancel" data-id="${a.id}">
                                Cancelar
                              </button>
                            `
                            : ''
                        }
                      </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          `
      }
    </section>
  `;
}

function openAppointmentModal(appointment = null) {
  const modal = $('#modal');
  const eyebrow = $('#modalEyebrow');
  const title = $('#modalTitle');
  const fields = $('#modalFields');

  if (!modal || !fields || !title) {
    console.error('Estrutura do modal não encontrada.');
    toast('Não foi possível abrir o formulário.');
    return;
  }

  state.editingAppointment = appointment;
  state.modalType = 'appointment';

  if (eyebrow) {
    eyebrow.textContent = appointment
      ? 'EDITAR AGENDAMENTO'
      : 'NOVO AGENDAMENTO';
  }

  title.textContent = appointment
    ? 'Editar agendamento'
    : 'Novo agendamento';

  const pacientesOptions = state.patients.map(p => `
    <option
      value="${p.id}"
      ${appointment && Number(appointment.cliente_paciente_id) === Number(p.id) ? 'selected' : ''}
    >
      ${escapeHtml(p.nome)}
    </option>
  `).join('');

  const profissionaisOptions = state.professionals.map(p => `
  <option
    value="${p.profissional_id}"
    ${appointment && Number(appointment.psicologo_id) === Number(p.profissional_id) ? 'selected' : ''}
  >
    ${escapeHtml(p.nome)}
  </option>
`).join('');

  const dataHora = String(appointment?.data_hora_consulta || '')
    .replace(' ', 'T');

  const data = appointment ? dataHora.slice(0, 10) : '';
  const horario = appointment ? dataHora.slice(11, 16) : '';

  fields.innerHTML = `
    <label class="wide">
      Paciente
      <select id="appointmentPatient" required>
        <option value="">Selecione um paciente</option>
        ${pacientesOptions}
      </select>
    </label>

    <label class="wide">
      Psicólogo
      <select id="appointmentProfessional" required>
        <option value="">Selecione um profissional</option>
        ${profissionaisOptions}
      </select>
    </label>

    <label class="wide">
      Data da consulta
      <input
        id="appointmentDate"
        type="date"
        value="${escapeHtml(data)}"
        required
      >
    </label>

    <label class="wide">
      Horário
      <input
        id="appointmentTime"
        type="time"
        value="${escapeHtml(horario)}"
        required
      >
    </label>
  `;

  modal.showModal();
}
function renderProfile() {
  return `
    ${pageHeader(
      'Meu Perfil',
      'Visualize e atualize suas informações profissionais.'
    )}

    <section class="panel">
      <div class="panel-head">
        <div>
          <h3>Informações pessoais e profissionais</h3>
          <small>Mantenha seus dados atualizados.</small>
        </div>
      </div>

      <form id="formMeuPerfil">
        <div style="display:grid; gap:16px; padding:20px;">

          <label>
            Nome completo
            <input
              type="text"
              id="perfilNome"
              required
              style="width:100%; padding:12px; margin-top:6px;"
            >
          </label>

          <label>
            E-mail
            <input
              type="email"
              id="perfilEmail"
              required
              style="width:100%; padding:12px; margin-top:6px;"
            >
          </label>

          <label>
            Registro profissional (CRP)
            <input
              type="text"
              id="perfilRegistro"
              required
              style="width:100%; padding:12px; margin-top:6px;"
            >
          </label>

          <label>
            Área de atuação
            <input
              type="text"
              id="perfilArea"
              required
              style="width:100%; padding:12px; margin-top:6px;"
            >
          </label>

          <div>
            <button type="submit" class="button primary">
              Salvar alterações
            </button>
          </div>

        </div>
      </form>
    </section>
  `;
}

async function carregarMeuPerfil() {
  try {
    const perfil = await api('/profissionais/me');

    $('#perfilNome').value = perfil.nome || '';
    $('#perfilEmail').value = perfil.email || '';
    $('#perfilRegistro').value = perfil.registro_profissional || '';
    $('#perfilArea').value = perfil.area_atuacao || '';

  } catch (error) {
    console.error('Erro ao carregar perfil:', error);
    toast(error.message || 'Não foi possível carregar seu perfil.');
  }
}


async function salvarMeuPerfil(event) {
  event.preventDefault();

  const dados = {
    nome: $('#perfilNome').value.trim(),
    email: $('#perfilEmail').value.trim(),
    registro_profissional: $('#perfilRegistro').value.trim(),
    area_atuacao: $('#perfilArea').value.trim()
  };

  try {
    await api('/profissionais/me', {
      method: 'PUT',
      body: JSON.stringify(dados)
    });

    toast('Perfil atualizado com sucesso!');

    await carregarMeuPerfil();

  } catch (error) {
    console.error('Erro ao atualizar perfil:', error);
    toast(error.message || 'Não foi possível atualizar seu perfil.');
  }
}


function renderPage() {
  const pageContainer = $('#page');
  const crumb = $('#pageCrumb');

  if (crumb) crumb.textContent = titles[state.page] || 'Visão geral';

  document.querySelectorAll('#nav .nav-item').forEach(button => {
    button.classList.toggle('active', button.dataset.page === state.page);
  });

  if (!pageContainer) return;

  switch (state.page) {
    
case 'profile':
  pageContainer.innerHTML = renderProfile();

  carregarMeuPerfil();

  $('#formMeuPerfil')?.addEventListener(
    'submit',
    salvarMeuPerfil
  );

  break;

    case 'overview':
      pageContainer.innerHTML = renderOverview();
      $('#btnQuickAddPatient')?.addEventListener('click', () => openPatientModal());
      break;

    case 'patients':
      pageContainer.innerHTML = renderPatients();

      $('#btnAddPatient')?.addEventListener('click', () => openPatientModal());
      pageContainer.querySelectorAll('[data-action="edit"]').forEach(btn => {
  btn.addEventListener('click', () => {
    const patient = state.patients.find(
      p => Number(p.id) === Number(btn.dataset.id)
    );

    if (patient) {
      openPatientModal(patient);
    } else {
      toast('Não foi possível localizar este paciente.');
    }
  });
});

$('#searchPatient')?.addEventListener('input', e => {
  state.patientQuery = e.target.value;
  const cursor = e.target.selectionStart;

  renderPage();

  const campo = $('#searchPatient');

  if (campo) {
    campo.focus();
    campo.setSelectionRange(cursor, cursor);
  }
});

      $('#filterStatus')?.addEventListener('change', e => {
        state.patientStatus = e.target.value;
        renderPage();
      });

pageContainer.querySelectorAll('[data-action="deactivate"]').forEach(btn => {
  btn.addEventListener('click', async () => {
    const id = btn.dataset.id;

    if (!confirm('Deseja realmente inativar este paciente?')) {
      return;
    }

    try {
      await api(`/pacientes/${id}`, {
        method: 'DELETE'
      });

      toast('Paciente inativado com sucesso!');

      await loadPatients();
    } catch (error) {
      toast(error.message || 'Erro ao inativar paciente.');
    }
  });
});

  pageContainer.querySelectorAll('[data-action="reactivate"]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;

      if (!confirm('Deseja reativar este paciente?')) {
        return;
      }

      try {
        await api(`/pacientes/${id}/reativar`, {
          method: 'PUT'
        });

        toast('Paciente reativado com sucesso!');
        await loadPatients();
        await loadAppointments();

      } catch (error) {
        console.error('Erro ao reativar paciente:', error);
        toast(error.message || 'Erro ao reativar paciente.');
      }
    });
  });

pageContainer.querySelectorAll('[data-action="delete"]').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.dataset.id;

          if (!confirm('Deseja excluir este paciente permanentemente?')) {
            return;
          }

          try {
            await api(`/pacientes/${id}/excluir`, {
              method: 'DELETE'
            });

            toast('Paciente excluído com sucesso!');
            await loadPatients();
            await loadAppointments();

          } catch (error) {
            console.error('Erro ao excluir paciente:', error);
            toast(error.message || 'Erro ao excluir paciente.');
          }
        });
      });

      break;

    case 'appointments':
  pageContainer.innerHTML = renderAppointments();
  
  $('#btnAddAppointment')?.addEventListener('click', () => {
  openAppointmentModal();
});

pageContainer.querySelectorAll('[data-action="edit-appointment"]').forEach(btn => {
  btn.addEventListener('click', () => {
    console.log('1. Botão clicado. ID:', btn.dataset.id);
    console.log('2. Agendamentos carregados:', state.appointments);

    const appointment = state.appointments.find(a =>
      String(a.id) === String(btn.dataset.id)
    );

    console.log('3. Agendamento localizado:', appointment);

    if (appointment) {
      openAppointmentModal(appointment);
    } else {
      toast('Agendamento não localizado. Verifique o console.');
    }
  });
});

  pageContainer.querySelectorAll('[data-action="confirm"]').forEach(btn => {
    btn.addEventListener('click', async () => {
      try {
        await api(`/agendamentos/${btn.dataset.id}/status`, {
          method: 'PUT',
          body: JSON.stringify({
            status_confirmacao: 'confirmado'
          })
        });

        toast('Agendamento confirmado com sucesso!');
        await loadAppointments();

      } catch (error) {
        toast(error.message || 'Erro ao confirmar agendamento.');
      }
    });
  });

  pageContainer.querySelectorAll('[data-action="cancel"]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Deseja cancelar este agendamento?')) return;

      try {
        await api(`/agendamentos/${btn.dataset.id}/status`, {
          method: 'PUT',
          body: JSON.stringify({
            status_confirmacao: 'cancelado'
          })
        });

        toast('Agendamento cancelado com sucesso!');
        await loadAppointments();

      } catch (error) {
        toast(error.message || 'Erro ao cancelar agendamento.');
      }
    });
  });

pageContainer.querySelectorAll('[data-action="delete-appointment"]').forEach(btn => {
  btn.addEventListener('click', async () => {
    const id = btn.dataset.id;

    if (!confirm('Deseja realmente excluir este agendamento permanentemente?')) {
      return;
    }

    try {
      await api(`/agendamentos/${id}`, {
        method: 'DELETE'
      });

      toast('Agendamento excluído com sucesso!');
      await loadAppointments();

    } catch (error) {
      console.error('Erro ao excluir agendamento:', error);
      toast(error.message || 'Erro ao excluir agendamento.');
    }
  });
});

  break;

    
case 'team':
  pageContainer.innerHTML = `
    ${pageHeader(
      'Profissionais',
      'Gerencie os profissionais cadastrados no PsiConnect.',
      '<button id="btnNovoProfissional" class="button primary" type="button">+ Novo profissional</button>'
    )}

    <section class="panel">
      <div class="panel-head">
        <div>
          <h3>Profissionais cadastrados</h3>
          <small>Consulte os dados da equipe profissional.</small>
        </div>

        <button
          id="btnAtualizarProfissionais"
          class="button primary"
          type="button"
        >
          Atualizar lista
        </button>
      </div>

      <div id="listaProfissionais">
        <div class="empty">Carregando profissionais...</div>
      </div>
    </section>
  `;

  async function carregarProfissionais() {
    const lista = $('#listaProfissionais');

    if (!lista) return;

    lista.innerHTML =
      '<div class="empty">Carregando profissionais...</div>';

    try {
      const [resultadoProfissionais, resultadoUsuarios] =
        await Promise.all([
          api('/profissionais'),
          api('/usuarios')
        ]);

      const profissionais = Array.isArray(resultadoProfissionais)
        ? resultadoProfissionais
        : resultadoProfissionais.profissionais || [];

      const usuarios = Array.isArray(resultadoUsuarios)
        ? resultadoUsuarios
        : resultadoUsuarios.usuarios || [];

      // Mantém os psicólogos e acrescenta os atendentes.
      const psicologos = profissionais.map(profissional => ({
        ...profissional,
        tipo: 'psicologo'
      }));

      const atendentes = usuarios
        .filter(usuario =>
          String(usuario.perfil || '')
            .toLowerCase()
            .includes('atendente')
        )
        .map(usuario => ({
          ...usuario,
          tipo: 'atendente'
        }));

      const equipe = [...psicologos, ...atendentes];

      console.log('Equipe cadastrada:', equipe);

      if (equipe.length === 0) {
        lista.innerHTML =
          '<div class="empty">Nenhum profissional cadastrado.</div>';
        return;
      }

      const tabela = document.createElement('table');
      tabela.className = 'data-table';

      tabela.innerHTML = `
        <thead>
          <tr>
            <th>Profissional</th>
            <th>E-mail</th>
            <th>Tipo</th>
            <th>Registro profissional</th>
            <th>Área de atuação</th>
            <th>Situação</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody></tbody>
      `;

      const corpo = $('tbody', tabela);

      equipe.forEach(profissional => {
        const linha = document.createElement('tr');

        const celulaNome = document.createElement('td');
        celulaNome.className = 'person';

        celulaNome.innerHTML = `
          <div class="person-avatar">
            ${escapeHtml(initials(profissional.nome))}
          </div>
          <div>
            <strong>${escapeHtml(profissional.nome)}</strong>
          </div>
        `;

        linha.appendChild(celulaNome);

        const valores = [
          profissional.email || '—',
          profissional.tipo === 'atendente' ? 'Atendente' : 'Psicólogo',
          profissional.registro_profissional || '—',
          profissional.area_atuacao || '—'
        ];

        valores.forEach(valor => {
          const celula = document.createElement('td');
          celula.textContent = valor;
          linha.appendChild(celula);
        });

        const celulaSituacao = document.createElement('td');

        const situacao = String(
          profissional.situacao || 'ativo'
        ).toLowerCase();

        const status = document.createElement('span');
        status.className = `status-pill ${situacao.toUpperCase()}`;

        status.textContent = ({
          ativo: 'Ativo',
          inativo: 'Inativo',
          bloqueado: 'Bloqueado'
        })[situacao] || 'Indefinido';

        celulaSituacao.appendChild(status);
        linha.appendChild(celulaSituacao);

        const celulaAcoes = document.createElement('td');
        celulaAcoes.className = 'table-actions';

        const botaoEditar = document.createElement('button');
botaoEditar.type = 'button';
botaoEditar.textContent = 'Editar';

botaoEditar.addEventListener('click', () => {
    openProfessionalModal(profissional);
});

celulaAcoes.appendChild(botaoEditar);
        celulaAcoes.appendChild(botaoEditar);

        if (profissional.tipo === 'psicologo') {
          const botaoExcluir = document.createElement('button');
          botaoExcluir.type = 'button';
          botaoExcluir.textContent = 'Excluir';

          botaoExcluir.addEventListener('click', async () => {
            const confirmar = confirm(
              `Deseja excluir permanentemente o profissional ${profissional.nome}?`
            );

            if (!confirmar) return;

            try {
              await api(`/profissionais/${profissional.profissional_id}`, {
                method: 'DELETE'
              });

              toast('Profissional excluído com sucesso!');
              await carregarProfissionais();

            } catch (erro) {
              console.error('Erro ao excluir profissional:', erro);
              toast(erro.message || 'Não foi possível excluir o profissional.');
            }
          });

          celulaAcoes.appendChild(botaoExcluir);
        }

        linha.appendChild(celulaAcoes);
        corpo.appendChild(linha);
      });

      const tabelaWrap = document.createElement('div');
      tabelaWrap.className = 'table-wrap';
      tabelaWrap.appendChild(tabela);

      lista.replaceChildren(tabelaWrap);

    } catch (erro) {
      console.error('Erro ao carregar equipe:', erro);

      lista.innerHTML = `
        <div class="empty">
          Não foi possível carregar os profissionais.
          <br><br>
          ${escapeHtml(erro.message || 'Verifique sua conexão.')}
        </div>
      `;
    }
  }

  $('#btnAtualizarProfissionais')
    ?.addEventListener('click', carregarProfissionais);

  $('#btnNovoProfissional')
    ?.addEventListener('click', () => openProfessionalModal());

  carregarProfissionais();
  break;

    case 'audit':
  pageContainer.innerHTML = `
    ${pageHeader(
      'Registro de atividades',
      'Acompanhe as ações realizadas pelos usuários no PsiConnect.'
    )}

    <section class="panel">
      <div class="panel-head">
        <div>
          <h3>Histórico de atividades</h3>
          <small>Registros de ações realizadas no sistema.</small>
        </div>

        <button
          id="btnAtualizarAuditoria"
          class="button primary"
          type="button"
        >
          Atualizar lista
        </button>
      </div>

      <div id="listaAuditoria">
        <div class="empty">Carregando registros...</div>
      </div>
    </section>
  `;

  async function carregarAuditoria() {
    const lista = $('#listaAuditoria');

    if (!lista) return;

    lista.innerHTML =
      '<div class="empty">Carregando registros...</div>';

    try {
      const resultado = await api('/auditoria');

      const registros = Array.isArray(resultado)
        ? resultado
        : resultado.registros || [];

      if (registros.length === 0) {
        lista.innerHTML =
          '<div class="empty">Nenhuma atividade registrada ainda.</div>';
        return;
      }

      const tabela = document.createElement('table');
      tabela.className = 'data-table';

      tabela.innerHTML = `
        <thead>
          <tr>
            <th>Usuário</th>
            <th>Perfil</th>
            <th>Ação realizada</th>
            <th>Data e hora</th>
          </tr>
        </thead>
        <tbody></tbody>
      `;

      const corpo = $('tbody', tabela);

      registros.forEach(registro => {
        const linha = document.createElement('tr');

        const valores = [
          registro.nome_usuario || 'Usuário não identificado',
          registro.perfil || 'Não informado',
          registro.acao || 'Ação não informada'
        ];

        valores.forEach(valor => {
          const celula = document.createElement('td');
          celula.textContent = valor;
          linha.appendChild(celula);
        });

        const celulaData = document.createElement('td');

        const data = registro.data_hora
          ? new Date(
              String(registro.data_hora).replace(' ', 'T')
            ).toLocaleString('pt-BR')
          : '—';

        celulaData.textContent = data;
        linha.appendChild(celulaData);

        corpo.appendChild(linha);
      });

      const tabelaWrap = document.createElement('div');
      tabelaWrap.className = 'table-wrap';
      tabelaWrap.appendChild(tabela);

      lista.replaceChildren(tabelaWrap);

    } catch (erro) {
      console.error('Erro ao carregar auditoria:', erro);

      lista.innerHTML = `
        <div class="empty">
          Não foi possível carregar o registro de atividades.
          <br><br>
          ${escapeHtml(erro.message)}
        </div>
      `;
    }
  }

  $('#btnAtualizarAuditoria')
    ?.addEventListener('click', carregarAuditoria);

  carregarAuditoria();

  break;

    default:
      pageContainer.innerHTML = renderOverview();
  }
}



if (state.token && state.user) {$('#page')?.addEventListener('click', event => {
  const botao = event.target.closest('[data-action="edit-appointment"]');

  if (!botao) return;

  console.log('Clique no botão Editar detectado!');

  const appointment = state.appointments.find(
    a => String(a.id) === String(botao.dataset.id)
  );

  if (!appointment) {
    console.log('Agendamento não encontrado:', state.appointments);
    toast('Agendamento não encontrado.');
    return;
  }

  try {
    openAppointmentModal(appointment);
  } catch (error) {
    console.error('Erro ao abrir edição:', error);
    toast('Erro ao abrir o formulário de edição.');
  }
});
  showApp();
  loadPatients();
  loadAppointments();
} else {
  showLogin();
}

