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
    .forEach(pageElement => {
      pageElement.classList.add("hidden");
    });

  $(`${page}Page`)?.classList.remove("hidden");

  document
    .querySelectorAll("[data-page]")
    .forEach(button => {
      button.classList.toggle(
        "active",
        button.dataset.page === page
      );
    });

  const titles = {
    dashboard: "Início",
    alunos: "Alunos",
    financeiro: "Financeiro",
    acessos: "Acessos",
    comercial: "Comercial",
    treinos: "Treinos",
    avaliacoes: "Avaliações",
    relatorios: "Relatórios"
  };

  $("pageTitle").textContent =
    titles[page] || page;

  if (page === "alunos") {
    renderStudents();
  }
}

async function loadAll() {

  if (demoMode) {

    studentsCache = JSON.parse(
      localStorage.getItem(
        "thm_demo_students"
      ) || "[]"
    );

    updateStats();
    renderStudents();
    renderRecent();

    return;
  }

  const [
    students,
    financial,
    accesses,
    workouts
  ] = await Promise.all([

    client
      .from("alunos")
      .select(`
        id,
        nome,
        cpf,
        telefone,
        data_nascimento,
        objetivo,
        plano,
        status,
        ciclo,
        criado_em,
        matricula,
        data_matricula,
        data_inicio,
        observacoes,
        responsavel,
        telefone_responsavel,
        cep,
        estado,
        rua,
        numero,
        complemento,
        bairro,
        cidade
      `)
      .order("nome"),

    client
      .from("financeiro")
      .select("id", {
        count: "exact",
        head: true
      }),

    client
      .from("acessos")
      .select("id", {
        count: "exact",
        head: true
      }),

    client
      .from("treinos")
      .select("id", {
        count: "exact",
        head: true
      })

  ]);

  if (students.error) {
    return toast(
      students.error.message,
      true
    );
  }

  studentsCache =
    students.data || [];

  $("statAlunos").textContent =
    studentsCache.filter(
      student =>
        student.status === "ativo"
    ).length;

  $("statFinanceiro").textContent =
    financial.count ?? 0;

  $("statAcessos").textContent =
    accesses.count ?? 0;

  $("statTreinos").textContent =
    workouts.count ?? 0;

  renderStudents();
  renderRecent();
}

function updateStats() {

  $("statAlunos").textContent =
    studentsCache.filter(
      student =>
        student.status === "ativo"
    ).length;

  [
    "statFinanceiro",
    "statAcessos",
    "statTreinos"
  ].forEach(id => {
    $(id).textContent = "—";
  });
}

function renderRecent() {

  $("recentStudents").innerHTML =
    studentsCache
      .slice(0, 5)
      .map(student => `

        <div class="simple-item">

          <span>
            ${esc(student.nome)}
          </span>

          <span class="status ${student.status}">
            ${esc(student.status)}
          </span>

        </div>

      `)
      .join("")
      ||
      `
        <div class="simple-item">
          Nenhum aluno cadastrado.
        </div>
      `;
}

function renderStudents() {

  const search =
    ($("studentSearch")?.value || "")
      .toLowerCase();

  const status =
    $("studentStatus")?.value ||
    "todos";

  const rows =
    studentsCache.filter(student => {

      const matchesStatus =
        status === "todos" ||
        student.status === status;

      const searchText = [
        student.nome,
        student.cpf,
        student.telefone,
        student.matricula
      ]
        .join(" ")
        .toLowerCase();

      return (
        matchesStatus &&
        searchText.includes(search)
      );
    });

  $("studentsTable").innerHTML = `

    <table class="table">

      <thead>

        <tr>

          <th>Matrícula</th>
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
          rows
            .map(student => `

              <tr>

                <td>
                  ${esc(
                    student.matricula ||
                    "—"
                  )}
                </td>

                <td>
                  <strong>
                    ${esc(student.nome)}
                  </strong>
                </td>

                <td>
                  ${esc(
                    student.cpf ||
                    "—"
                  )}
                </td>

                <td>
                  ${esc(
                    student.telefone ||
                    "—"
                  )}
                </td>

                <td>
                  ${esc(
                    student.plano ||
                    "—"
                  )}
                </td>

                <td>

                  <span
                    class="status ${student.status}"
                  >
                    ${esc(student.status)}
                  </span>

                </td>

                <td>
                  ${student.ciclo ?? 1}
                </td>

                <td>

                  <button
                    class="mini"
                    data-edit="${student.id}"
                  >
                    Editar
                  </button>

                  ${
                    student.status === "inativo"
                      ?
                      `
                        <button
                          class="mini"
                          data-reuse="${student.id}"
                        >
                          ♻ Reaproveitar
                        </button>
                      `
                      :
                      ""
                  }

                </td>

              </tr>

            `)
            .join("")
        }

        ${
          rows.length === 0
            ?
            `
              <tr>
                <td colspan="8">
                  Nenhum aluno encontrado.
                </td>
              </tr>
            `
            :
            ""
        }

      </tbody>

    </table>
  `;

  document
    .querySelectorAll("[data-edit]")
    .forEach(button => {

      button.onclick = () => {
        openStudent(
          button.dataset.edit
        );
      };

    });

  document
    .querySelectorAll("[data-reuse]")
    .forEach(button => {

      button.onclick = () => {
        reuseStudent(
          button.dataset.reuse
        );
      };

    });
}

function closeModal() {

  $("studentModal")
    .classList.add("hidden");

  $("studentForm").reset();

  $("studentId").value = "";
}

function openStudent(id) {

  const student =
    studentsCache.find(
      item => item.id === id
    );

  if (!student) return;

  $("studentId").value =
    student.id;

  $("studentMatricula").value =
    student.matricula || "";

  $("studentName").value =
    student.nome || "";

  $("studentCpf").value =
    student.cpf || "";

  $("studentPhone").value =
    student.telefone || "";

  $("studentBirth").value =
    student.data_nascimento || "";

  $("studentGoal").value =
    student.objetivo || "";

  $("studentPlan").value =
    student.plano || "";

  $("studentStatusForm").value =
    student.status || "ativo";

  $("studentDataMatricula").value =
    student.data_matricula || "";

  $("studentDataInicio").value =
    student.data_inicio || "";

  $("studentResponsavel").value =
    student.responsavel || "";

  $("studentTelefoneResponsavel").value =
    student.telefone_responsavel || "";

  $("studentCep").value =
    student.cep || "";

  $("studentEstado").value =
    student.estado || "";

  $("studentRua").value =
    student.rua || "";

  $("studentNumero").value =
    student.numero || "";

  $("studentComplemento").value =
    student.complemento || "";

  $("studentBairro").value =
    student.bairro || "";

  $("studentCidade").value =
    student.cidade || "";

  $("studentObservacoes").value =
    student.observacoes || "";

  $("modalTitle").textContent =
    "Editar aluno";

  $("studentModal")
    .classList.remove("hidden");
}

async function saveStudent(event) {

  event.preventDefault();

  const id =
    $("studentId").value;

  const data = {

    matricula:
      $("studentMatricula")
        .value
        .trim() || null,

    nome:
      $("studentName")
        .value
        .trim(),

    cpf:
      $("studentCpf")
        .value
        .trim() || null,

    telefone:
      $("studentPhone")
        .value
        .trim() || null,

    data_nascimento:
      $("studentBirth")
        .value || null,

    objetivo:
      $("studentGoal")
        .value || null,

    plano:
      $("studentPlan")
        .value
        .trim() || null,

    status:
      $("studentStatusForm")
        .value,

    data_matricula:
      $("studentDataMatricula")
        .value || null,

    data_inicio:
      $("studentDataInicio")
        .value || null,

    responsavel:
      $("studentResponsavel")
        .value
        .trim() || null,

    telefone_responsavel:
      $("studentTelefoneResponsavel")
        .value
        .trim() || null,

    cep:
      $("studentCep")
        .value
        .trim() || null,

    estado:
      $("studentEstado")
        .value
        .trim()
        .toUpperCase() || null,

    rua:
      $("studentRua")
        .value
        .trim() || null,

    numero:
      $("studentNumero")
        .value
        .trim() || null,

    complemento:
      $("studentComplemento")
        .value
        .trim() || null,

    bairro:
      $("studentBairro")
        .value
        .trim() || null,

    cidade:
      $("studentCidade")
        .value
        .trim() || null,

    observacoes:
      $("studentObservacoes")
        .value
        .trim() || null
  };

  if (!data.nome) {

    return toast(
      "Informe o nome.",
      true
    );
  }

  if (demoMode) {

    if (id) {

      studentsCache =
        studentsCache.map(
          student =>
            student.id === id
              ?
              {
                ...student,
                ...data
              }
              :
              student
        );

    } else {

      studentsCache = [

        {
          id: crypto.randomUUID(),

          ...data,

          ciclo: 1,

          criado_em:
            new Date().toISOString()
        },

        ...studentsCache

      ];
    }

    localStorage.setItem(
      "thm_demo_students",
      JSON.stringify(
        studentsCache
      )
    );

    closeModal();

    updateStats();
    renderStudents();
    renderRecent();

    return toast(
      "Aluno salvo."
    );
  }

  const result = id

    ?

      await client
        .from("alunos")
        .update(data)
        .eq("id", id)
        .select()
        .single()

    :

      await client
        .from("alunos")
        .insert({
          ...data,
          ciclo: 1
        })
        .select()
        .single();

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
      ?
      "Aluno atualizado."
      :
      "Aluno cadastrado com sucesso."
  );
}

async function reuseStudent(id) {

  const oldStudent =
    studentsCache.find(
      student =>
        student.id === id
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
    prompt(
      "Nome do novo aluno:"
    );

  if (!name?.trim()) return;

  const data = {

    matricula: null,

    nome: name.trim(),

    cpf: null,
    telefone: null,
    data_nascimento: null,

    objetivo: null,
    plano: null,

    status: "ativo",

    data_matricula: null,
    data_inicio: null,

    responsavel: null,
    telefone_responsavel: null,

    cep: null,
    estado: null,
    rua: null,
    numero: null,
    complemento: null,
    bairro: null,
    cidade: null,

    observacoes: null,

    ciclo:
      (oldStudent.ciclo || 1) + 1
  };

  if (demoMode) {

    studentsCache.unshift({
      id: crypto.randomUUID(),
      ...data
    });

    localStorage.setItem(
      "thm_demo_students",
      JSON.stringify(
        studentsCache
      )
    );

    updateStats();
    renderStudents();
    renderRecent();

    return toast(
      "Novo ciclo criado."
    );
  }

  const result =
    await client
      .from("alunos")
      .insert(data);

  if (result.error) {

    return toast(
      result.error.message,
      true
    );
  }

  await loadAll();

  toast(
    "Novo cadastro criado."
  );
}

async function buscarCep() {

  const cepInput =
    $("studentCep");

  if (!cepInput) return;

  const cep =
    cepInput.value
      .replace(/\D/g, "");

  if (cep.length !== 8) {
    return;
  }

  cepInput.value =
    cep.substring(0, 5) +
    "-" +
    cep.substring(5);

  try {

    const response =
      await fetch(
        `https://viacep.com.br/ws/${cep}/json/`
      );

    if (!response.ok) {
      throw new Error(
        "Erro na consulta."
      );
    }

    const data =
      await response.json();

    if (data.erro) {

      return toast(
        "CEP não encontrado.",
        true
      );
    }

    $("studentRua").value =
      data.logradouro || "";

    $("studentBairro").value =
      data.bairro || "";

    $("studentCidade").value =
      data.localidade || "";

    $("studentEstado").value =
      (data.uf || "")
        .toUpperCase();

    $("studentNumero").focus();

    toast(
      "Endereço encontrado."
    );

  } catch (error) {

    console.error(error);

    toast(
      "Não foi possível consultar o CEP.",
      true
    );
  }
}

function formatCep(event) {

  let value =
    event.target.value
      .replace(/\D/g, "");

  if (value.length > 8) {
    value =
      value.substring(0, 8);
  }

  if (value.length > 5) {

    value =
      value.substring(0, 5) +
      "-" +
      value.substring(5);
  }

  event.target.value =
    value;

  if (
    value.replace(/\D/g, "")
      .length === 8
  ) {
    buscarCep();
  }
}

async function login(event) {

  event.preventDefault();

  const {
    data,
    error
  } =
    await client.auth
      .signInWithPassword({

        email:
          $("loginEmail")
            .value
            .trim(),

        password:
          $("loginPassword")
            .value

      });

  if (error) {

    return toast(
      error.message,
      true
    );
  }

  showApp(
    data.user.email
  );
}

async function logout() {

  if (!demoMode) {
    await client.auth.signOut();
  }

  demoMode = false;

  $("app")
    .classList.add("hidden");

  $("loginScreen")
    .classList.remove("hidden");

  $("loginPassword")
    .value = "";
}

document.addEventListener(
  "click",
  event => {

    const button =
      event.target.closest(
        "[data-page]"
      );

    if (button) {

      goTo(
        button.dataset.page
      );
    }
  }
);

$("loginForm")
  .addEventListener(
    "submit",
    login
  );

$("demoBtn").onclick = () => {

  demoMode = true;

  showApp(
    "Demonstração"
  );
};

$("logoutBtn")
  .onclick = logout;

$("newStudentBtn").onclick = () => {

  $("studentForm").reset();

  $("studentId").value = "";

  $("modalTitle").textContent =
    "Novo aluno";

  $("studentModal")
    .classList.remove("hidden");
};

$("closeModal")
  .onclick = closeModal;

$("cancelModal")
  .onclick = closeModal;

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

$("studentCep")
  .addEventListener(
    "input",
    formatCep
  );

(async () => {

  const {
    data: {
      session
    }
  } =
    await client.auth
      .getSession();

  if (session) {

    showApp(
      session.user.email
    );
  }

})();