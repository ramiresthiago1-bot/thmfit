const { createClient } = window.supabase;

const client = createClient(
  THM_CONFIG.SUPABASE_URL,
  THM_CONFIG.SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
);

let demoMode = false;
let studentsCache = [];

const $ = id => document.getElementById(id);

function toast(message, error = false) {
  const element = $("toast");

  element.textContent = message;
  element.className = `toast show${error ? " error" : ""}`;

  setTimeout(() => {
    element.className = "toast";
  }, 3000);
}

function esc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function showApp(label) {
  $("loginScreen").classList.add("hidden");
  $("app").classList.remove("hidden");
  $("userLabel").textContent = label;

  goTo("dashboard");
  loadAll();
}

function goTo(page) {
  document
    .querySelectorAll(".page")
    .forEach(element => element.classList.add("hidden"));

  $(`${page}Page`)?.classList.remove("hidden");

  document
    .querySelectorAll("[data-page]")
    .forEach(element =>
      element.classList.toggle("active", element.dataset.page === page)
    );

  $("pageTitle").textContent = {
    dashboard: "Início",
    alunos: "Alunos",
    financeiro: "Financeiro",
    acessos: "Acessos",
    comercial: "Comercial",
    treinos: "Treinos",
    avaliacoes: "Avaliações",
    relatorios: "Relatórios"
  }[page] || page;

  if (page === "alunos") {
    renderStudents();
  }
}

async function loadAll() {

  if (demoMode) {

    studentsCache = JSON.parse(
      localStorage.getItem("thm_demo_students") || "[]"
    );

    updateStats();
    renderStudents();
    renderRecent();

    return;
  }

  const [
    students,
    financeiro,
    acessos,
    treinos
  ] = await Promise.all([

    client
      .from("alunos")
      .select(`
        id,
        nome,
        cpf,
        telefone,
        email,
        data_nascimento,
        objetivo,
        plano,
        status,
        ciclo,
        criado_em,
        atualizado_em,
        cep,
        logradouro,
        numero,
        complemento,
        bairro,
        cidade,
        estado,
        responsavel_nome,
        responsavel_telefone,
        observacoes
      `)
      .order("nome"),

    client
      .from("financeiro")
      .select("id", { count: "exact", head: true }),

    client
      .from("acessos")
      .select("id", { count: "exact", head: true }),

    client
      .from("treinos")
      .select("id", { count: "exact", head: true })
  ]);

  if (students.error) {
    return toast(students.error.message, true);
  }

  studentsCache = students.data || [];

  $("statAlunos").textContent =
    studentsCache.filter(student => student.status === "ativo").length;

  $("statFinanceiro").textContent = financeiro.count ?? 0;
  $("statAcessos").textContent = acessos.count ?? 0;
  $("statTreinos").textContent = treinos.count ?? 0;

  renderStudents();
  renderRecent();
}

function updateStats() {

  $("statAlunos").textContent =
    studentsCache.filter(student => student.status === "ativo").length;

  ["statFinanceiro", "statAcessos", "statTreinos"]
    .forEach(id => $(id).textContent = "—");
}

function renderRecent() {

  $("recentStudents").innerHTML =
    studentsCache
      .slice(0, 5)
      .map(student => `
        <div class="simple-item">
          <span>${esc(student.nome)}</span>
          <span class="status ${student.status}">
            ${esc(student.status)}
          </span>
        </div>
      `)
      .join("")
    ||
    `<div class="simple-item">Nenhum aluno cadastrado.</div>`;
}

function renderStudents() {

  const query =
    ($("studentSearch")?.value || "").toLowerCase();

  const status =
    $("studentStatus")?.value || "todos";

  const rows = studentsCache.filter(student => {

    const matchesStatus =
      status === "todos" ||
      student.status === status;

    const searchableText = [
      student.nome,
      student.cpf,
      student.telefone,
      student.email
    ]
      .join(" ")
      .toLowerCase();

    return matchesStatus && searchableText.includes(query);
  });

  $("studentsTable").innerHTML = `
    <table class="table">

      <thead>
        <tr>
          <th>Nome</th>
          <th>CPF</th>
          <th>Telefone</th>
          <th>Plano</th>
          <th>Status</th>
          <th>Ciclo</th>
          <th>Ações</th>
        </tr>
      </thead>

      <tbody>

        ${
          rows.map(student => `
            <tr>

              <td>
                <strong>${esc(student.nome)}</strong>
              </td>

              <td>${esc(student.cpf || "—")}</td>

              <td>${esc(student.telefone || "—")}</td>

              <td>${esc(student.plano || "—")}</td>

              <td>
                <span class="status ${student.status}">
                  ${esc(student.status)}
                </span>
              </td>

              <td>${student.ciclo ?? 1}</td>

              <td>

                <button
                  class="mini"
                  data-edit="${student.id}">
                  Editar
                </button>

                ${
                  student.status === "inativo"
                    ? `
                      <button
                        class="mini"
                        data-reuse="${student.id}">
                        ♻ Reaproveitar
                      </button>
                    `
                    : ""
                }

              </td>

            </tr>
          `).join("")
        }

        ${
          rows.length === 0
            ? `<tr>
                <td colspan="7">
                  Nenhum aluno encontrado.
                </td>
              </tr>`
            : ""
        }

      </tbody>

    </table>
  `;

  document
    .querySelectorAll("[data-edit]")
    .forEach(button => {
      button.onclick = () =>
        openStudent(button.dataset.edit);
    });

  document
    .querySelectorAll("[data-reuse]")
    .forEach(button => {
      button.onclick = () =>
        reuseStudent(button.dataset.reuse);
    });
}

function closeModal() {

  $("studentModal").classList.add("hidden");

  $("studentForm").reset();

  $("studentId").value = "";
}

function openStudent(id) {

  const student =
    studentsCache.find(item => item.id === id);

  if (!student) return;

  $("studentId").value = student.id;

  $("studentName").value =
    student.nome || "";

  $("studentCpf").value =
    student.cpf || "";

  $("studentPhone").value =
    student.telefone || "";

  $("studentEmail").value =
    student.email || "";

  $("studentBirth").value =
    student.data_nascimento || "";

  $("studentCep").value =
    student.cep || "";

  $("studentLogradouro").value =
    student.logradouro || "";

  $("studentNumero").value =
    student.numero || "";

  $("studentComplemento").value =
    student.complemento || "";

  $("studentBairro").value =
    student.bairro || "";

  $("studentCidade").value =
    student.cidade || "";

  $("studentEstado").value =
    student.estado || "";

  $("studentResponsibleName").value =
    student.responsavel_nome || "";

  $("studentResponsiblePhone").value =
    student.responsavel_telefone || "";

  $("studentGoal").value =
    student.objetivo || "";

  $("studentPlan").value =
    student.plano || "";

  $("studentStatusForm").value =
    student.status || "ativo";

  $("studentNotes").value =
    student.observacoes || "";

  $("modalTitle").textContent =
    "Editar aluno";

  $("studentModal")
    .classList
    .remove("hidden");
}

function getStudentFormData() {

  return {
    nome: $("studentName").value.trim(),

    cpf:
      $("studentCpf").value.trim() || null,

    telefone:
      $("studentPhone").value.trim() || null,

    email:
      $("studentEmail").value.trim() || null,

    data_nascimento:
      $("studentBirth").value || null,

    cep:
      $("studentCep").value.trim() || null,

    logradouro:
      $("studentLogradouro").value.trim() || null,

    numero:
      $("studentNumero").value.trim() || null,

    complemento:
      $("studentComplemento").value.trim() || null,

    bairro:
      $("studentBairro").value.trim() || null,

    cidade:
      $("studentCidade").value.trim() || null,

    estado:
      $("studentEstado").value.trim().toUpperCase() || null,

    responsavel_nome:
      $("studentResponsibleName").value.trim() || null,

    responsavel_telefone:
      $("studentResponsiblePhone").value.trim() || null,

    objetivo:
      $("studentGoal").value || null,

    plano:
      $("studentPlan").value.trim() || null,

    status:
      $("studentStatusForm").value,

    observacoes:
      $("studentNotes").value.trim() || null
  };
}

async function saveStudent(event) {

  event.preventDefault();

  const id = $("studentId").value;

  const studentData =
    getStudentFormData();

  if (!studentData.nome) {
    return toast(
      "Informe o nome do aluno.",
      true
    );
  }

  if (demoMode) {

    if (id) {

      studentsCache =
        studentsCache.map(student =>
          student.id === id
            ? { ...student, ...studentData }
            : student
        );

    } else {

      studentsCache = [
        {
          id: crypto.randomUUID(),
          ...studentData,
          ciclo: 1,
          criado_em: new Date().toISOString()
        },
        ...studentsCache
      ];
    }

    localStorage.setItem(
      "thm_demo_students",
      JSON.stringify(studentsCache)
    );

    closeModal();
    updateStats();
    renderStudents();
    renderRecent();

    return toast("Aluno salvo.");
  }

  let result;

  if (id) {

    result = await client
      .from("alunos")
      .update(studentData)
      .eq("id", id)
      .select()
      .single();

  } else {

    result = await client
      .from("alunos")
      .insert({
        ...studentData,
        ciclo: 1
      })
      .select()
      .single();
  }

  if (result.error) {
    return toast(
      result.error.message,
      true
    );
  }

  closeModal();

  await loadAll();

  toast(
    id
      ? "Aluno atualizado com sucesso."
      : "Aluno cadastrado com sucesso."
  );
}

async function reuseStudent(id) {

  const oldStudent =
    studentsCache.find(
      student => student.id === id
    );

  if (!oldStudent) return;

  if (
    !confirm(
      `Reaproveitar o cadastro de "${oldStudent.nome}"? O histórico anterior será preservado.`
    )
  ) {
    return;
  }

  const name =
    prompt("Nome do novo aluno:");

  if (!name?.trim()) return;

  const studentData = {

    nome: name.trim(),

    cpf: null,
    telefone: null,
    email: null,
    data_nascimento: null,

    cep: null,
    logradouro: null,
    numero: null,
    complemento: null,
    bairro: null,
    cidade: null,
    estado: null,

    responsavel_nome: null,
    responsavel_telefone: null,

    objetivo: null,
    plano: null,

    status: "ativo",

    observacoes: null,

    ciclo: (oldStudent.ciclo || 1) + 1
  };

  if (demoMode) {

    studentsCache.unshift({
      id: crypto.randomUUID(),
      ...studentData
    });

    localStorage.setItem(
      "thm_demo_students",
      JSON.stringify(studentsCache)
    );

    updateStats();
    renderStudents();
    renderRecent();

    return toast("Novo ciclo criado.");
  }

  const result =
    await client
      .from("alunos")
      .insert(studentData);

  if (result.error) {
    return toast(
      result.error.message,
      true
    );
  }

  await loadAll();

  toast("Novo cadastro criado.");
}

async function login(event) {

  event.preventDefault();

  const {
    data,
    error
  } = await client.auth.signInWithPassword({
    email: $("loginEmail").value.trim(),
    password: $("loginPassword").value
  });

  if (error) {
    return toast(
      error.message,
      true
    );
  }

  showApp(data.user.email);
}

async function logout() {

  if (!demoMode) {
    await client.auth.signOut();
  }

  demoMode = false;

  $("app").classList.add("hidden");

  $("loginScreen")
    .classList
    .remove("hidden");

  $("loginPassword").value = "";
}

document.addEventListener("click", event => {

  const button =
    event.target.closest("[data-page]");

  if (button) {
    goTo(button.dataset.page);
  }
});

$("loginForm")
  .addEventListener("submit", login);

$("demoBtn").onclick = () => {

  demoMode = true;

  showApp("Demonstração");
};

$("logoutBtn").onclick = logout;

$("newStudentBtn").onclick = () => {

  $("studentForm").reset();

  $("studentId").value = "";

  $("modalTitle").textContent =
    "Novo aluno";

  $("studentModal")
    .classList
    .remove("hidden");
};

$("closeModal").onclick =
  closeModal;

$("cancelModal").onclick =
  closeModal;

$("studentForm")
  .addEventListener(
    "submit",
    saveStudent
  );

$("studentSearch")
  .addEventListener(
    "input",
    renderStudents
  );

$("studentStatus")
  .addEventListener(
    "change",
    renderStudents
  );

(async () => {

  const {
    data: { session }
  } = await client.auth.getSession();

  if (session) {
    showApp(session.user.email);
  }

})();