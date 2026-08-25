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
 
if (page === "financeiro") {
  loadFinance();
}
if (page === "acessos") {
  loadAccesses();
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
        plano_id,
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
$("studentDescontoMatricula").checked = false;

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

  const isNewStudent = !id;

  const descontoMatricula =
    isNewStudent &&
    $("studentDescontoMatricula")?.checked === true;

  const taxaMatricula =
    descontoMatricula ? 0 : 10;

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
if (!id && taxaMatricula > 0) {
  const alunoId = result.data?.id;

  console.log("ALUNO CRIADO:", result.data);
  console.log("ID DO ALUNO:", alunoId);
  console.log("TAXA MATRÍCULA:", taxaMatricula);

  if (alunoId) {
    const dataMatricula =
      $("studentDataMatricula")?.value ||
      new Date().toISOString().slice(0, 10);

    const financeiroResult =
      await client
        .from("financeiro")
        .insert({
          aluno_id: alunoId,
          tipo: "matricula",
          status: "Pendente",
          descricao: "Taxa de matrícula",
          valor: taxaMatricula,
          data_vencimento: dataMatricula,
          data_pagamento: null,
          forma_pagamento: null,
          observacoes: "Taxa de matrícula do novo cadastro"
        });

    if (financeiroResult.error) {
      console.error(
        "Erro ao criar taxa de matrícula:",
        financeiroResult.error
      );

      toast(
        "Aluno cadastrado, mas houve um erro ao criar a taxa de matrícula.",
        true
      );
    }
  }
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

$("newStudentBtn").onclick = async () => {
  $("studentForm").reset();
  $("studentId").value = "";

  let alunos = [];

  if (demoMode) {
    alunos = studentsCache || [];
  } else {
    const result =
      await client
        .from("alunos")
        .select("matricula");

    if (result.error) {
      console.error(
        "Erro ao buscar matrículas:",
        result.error
      );

      return toast(
        "Não foi possível gerar a matrícula.",
        true
      );
    }

    alunos = result.data || [];
  }

  const matriculas = alunos
    .map(aluno =>
      Number(aluno.matricula)
    )
    .filter(numero =>
      Number.isInteger(numero) &&
      numero > 0
    );

  const maiorMatricula =
    matriculas.length
      ? Math.max(...matriculas)
      : 0;

  const proximaMatricula =
    maiorMatricula + 1;

  if (proximaMatricula > 5000) {
    return toast(
      "Limite de 5000 matrículas atingido.",
      true
    );
  }

  $("studentMatricula").value =
    proximaMatricula;

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

/* =========================================================
   ACESSOS - MODAL DE REGISTRO
   ========================================================= */

const newAccessBtn =
  document.getElementById("newAccessBtn");

const accessModal =
  document.getElementById("accessModal");

const closeAccessModal =
  document.getElementById("closeAccessModal");

const cancelAccessModal =
  document.getElementById("cancelAccessModal");


if (newAccessBtn) {

  newAccessBtn.onclick = () => {

    const form =
      document.getElementById("accessForm");

    if (form) {
      form.reset();
    }

loadAccessStudents();

    const equipment =
      document.getElementById(
        "accessEquipment"
      );

    if (equipment) {
      equipment.value =
        "Simulação manual";
    }

    if (accessModal) {
      accessModal.classList.remove(
        "hidden"
      );
    }

  };

}
const checkAccessBtn =
  document.getElementById("checkAccessBtn");

if (checkAccessBtn) {

  checkAccessBtn.onclick = () => {

    const studentId =
      document.getElementById(
        "accessStudent"
      )?.value;

    if (!studentId) {
      return toast(
        "Selecione um aluno primeiro.",
        true
      );
    }

    const student =
      studentsCache.find(
        item =>
          item.id === studentId
      );

    const decision =
      getAutomaticAccessDecision(
        student
      );

    const result =
      document.getElementById(
        "accessResult"
      );

    if (result) {
      result.value =
        decision.resultado;
    }

    toast(
      decision.motivo,
      decision.resultado ===
        "bloqueado"
    );
  };

}

/* Salvar acesso no Supabase */

async function saveAccess(event) {

  event.preventDefault();

  const alunoId =
    document.getElementById(
      "accessStudent"
    )?.value || null;

  const equipamento =
    document.getElementById(
      "accessEquipment"
    )?.value.trim() ||
    "Simulação manual";

  const tipo =
    document.getElementById(
      "accessType"
    )?.value || "entrada";

  const resultado =
    document.getElementById(
      "accessResult"
    )?.value || "liberado";


  if (!alunoId) {

    return toast(
      "Selecione um aluno.",
      true
    );

  }


  if (demoMode) {

    const newAccess = {

      id:
        "demo-" +
        Date.now(),

      aluno_id:
        alunoId,

      equipamento:
        equipamento,

      tipo:
        tipo,

      resultado:
        resultado,

      ocorrido_em:
        new Date().toISOString()

    };


    accessCache.unshift(
      newAccess
    );


    renderAccesses();

    document
      .getElementById(
        "accessModal"
      )
      ?.classList.add(
        "hidden"
      );


    return toast(
      "Acesso registrado."
    );

  }


  const {
    data,
    error
  } = await client
    .from("acessos")
    .insert({

      aluno_id:
        alunoId,

      equipamento:
        equipamento,

      tipo:
        tipo,

      resultado:
        resultado,

      ocorrido_em:
        new Date().toISOString(),
origem:
  "manual",
    })
    .select()
    .single();


  if (error) {

    console.error(
      "Erro ao registrar acesso:",
      error
    );

    return toast(
      error.message,
      true
    );

  }


  accessCache.unshift(
    data
  );


  renderAccesses();


  document
    .getElementById(
      "accessModal"
    )
    ?.classList.add(
      "hidden"
    );


  document
    .getElementById(
      "accessForm"
    )
    ?.reset();


  toast(
    "Acesso registrado com sucesso."
  );

}
const accessForm =
  document.getElementById(
    "accessForm"
  );

if (accessForm) {

  accessForm.addEventListener(
    "submit",
    saveAccess
  );

}

/* Carregar alunos no modal de acesso */

function loadAccessStudents() {

  const select =
    document.getElementById(
      "accessStudent"
    );

  if (!select) return;


  select.innerHTML = `
    <option value="">
      Selecione o aluno
    </option>
  `;


  studentsCache
    .filter(
      student =>
        student.status === "ativo"
    )
    .sort(
      (a, b) =>
        String(
          a.nome || ""
        ).localeCompare(
          String(
            b.nome || ""
          ),
          "pt-BR"
        )
    )
    .forEach(student => {

      const option =
        document.createElement(
          "option"
        );

      option.value =
        student.id;

      option.textContent =
        `${student.matricula || "—"} — ${student.nome}`;

      select.appendChild(
        option
      );

    });

}

if (closeAccessModal) {

  closeAccessModal.onclick = () => {

    if (accessModal) {
      accessModal.classList.add(
        "hidden"
      );
    }

  };

}


if (cancelAccessModal) {

  cancelAccessModal.onclick = () => {

    if (accessModal) {
      accessModal.classList.add(
        "hidden"
      );
    }

  };

}

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

/* =========================================================
   ACESSOS
   ========================================================= */

let accessCache = [];

/* =========================================================
   VERSÃO 10 - REGRA AUTOMÁTICA DE ACESSO
   ========================================================= */

const ACCESS_GRACE_DAYS = 2;


/* Verifica se o lançamento está vencido
   considerando os 2 dias de carência */
function isFinanceOverdue(finance) {

  if (!finance) {
    return false;
  }

  if (finance.status === "pago") {
    return false;
  }

  if (!finance.data_vencimento) {
    return false;
  }

  const today = new Date();

  today.setHours(
    0,
    0,
    0,
    0
  );

  const dueDate =
    new Date(
      finance.data_vencimento
    );

  dueDate.setHours(
    0,
    0,
    0,
    0
  );

  const graceLimit =
    new Date(
      dueDate
    );

  graceLimit.setDate(
    graceLimit.getDate() +
      ACCESS_GRACE_DAYS
  );

  return today > graceLimit;
}


/* Decide automaticamente se o aluno
   pode ou não acessar a academia */
function getAutomaticAccessDecision(student) {

  if (!student) {

    return {
      resultado: "bloqueado",
      motivo: "Aluno não encontrado"
    };

  }


  if (student.status !== "ativo") {

    return {
      resultado: "bloqueado",
      motivo: "Aluno inativo"
    };

  }


  const financialCache =
    window.accessFinancialCache || [];


  const records =
    financialCache
      .filter(
        item =>
          item.aluno_id ===
          student.id
      )
      .filter(
        item =>
          item.status !==
          "cancelado"
      );


  if (!records.length) {

    return {
      resultado: "bloqueado",
      motivo:
        "Sem informação financeira"
    };

  }


  records.sort(
    (a, b) =>
      new Date(
        b.data_vencimento || 0
      ) -
      new Date(
        a.data_vencimento || 0
      )
  );


  const latest =
    records[0];


  if (latest.status === "pago") {

    return {
      resultado: "liberado",
      motivo:
        "Mensalidade paga"
    };

  }


  if (
    latest.status === "aberto" ||
    latest.status === "atrasado"
  ) {

    if (
      !isFinanceOverdue(
        latest
      )
    ) {

      return {
        resultado: "liberado",
        motivo:
          "Dentro do período de carência"
      };

    }


    return {
      resultado: "bloqueado",
      motivo:
        "Mensalidade vencida após carência"
    };

  }


  return {
    resultado: "bloqueado",
    motivo:
      "Situação financeira irregular"
  };

}

/* Carregar acessos */
async function loadAccesses() {

  if (demoMode) {
    accessCache = [];
    renderAccesses();
    return;
  }

  const [
    accesses,
    financial
  ] = await Promise.all([

    client
      .from("acessos")
      .select(`
        id,
        aluno_id,
        equipamento,
        tipo,
        resultado,
        ocorrido_em
      `)
      .order("ocorrido_em", {
        ascending: false
      }),

    client
      .from("financeiro")
      .select(`
        id,
        aluno_id,
        status,
        valor,
        data_vencimento,
        data_pagamento
      `)
      .order("data_vencimento", {
        ascending: false
      })

  ]);


  if (accesses.error) {

    console.error(
      "Erro ao carregar acessos:",
      accesses.error
    );

    return toast(
      accesses.error.message,
      true
    );

  }


  if (financial.error) {

    console.error(
      "Erro ao carregar financeiro dos acessos:",
      financial.error
    );

    return toast(
      financial.error.message,
      true
    );

  }


  accessCache = accesses.data || [];


  window.accessFinancialCache =
    financial.data || [];


  renderAccesses();

}


/* Renderizar tela de Acessos */
function renderAccesses() {

  const table =
    document.getElementById(
      "accessTable"
    );

  if (!table) return;


  const search =
    (
      document.getElementById(
        "accessSearch"
      )?.value || ""
    )
      .toLowerCase();


  const statusFilter =
    document.getElementById(
      "accessStatus"
    )?.value || "todos";


  const financialCache =
    window.accessFinancialCache || [];


  /*
    Descobrir o último acesso de cada aluno
  */

  const latestAccess = {};


  accessCache.forEach(access => {

    if (!latestAccess[access.aluno_id]) {

      latestAccess[access.aluno_id] =
        access;

    }

  });


  /*
    Montar situação financeira
  */

  function getFinancialStatus(
    studentId
  ) {

    const records =
      financialCache.filter(
        item =>
          item.aluno_id === studentId
      );


    if (!records.length) {
      return "Sem lançamentos";
    }


    if (
      records.some(
        item =>
          item.status === "atrasado"
      )
    ) {

      return "Em atraso";

    }


    if (
      records.some(
        item =>
          item.status === "aberto"
      )
    ) {

      return "Em aberto";

    }


    if (
      records.some(
        item =>
          item.status === "pago"
      )
    ) {

      return "Em dia";

    }


    return "Não verificado";

  }


  /*
    Determinar se o acesso está liberado
  */

  function getAccessStatus(
    student,
    financialStatus
  ) {

    if (
      student.status !== "ativo"
    ) {

      return "Bloqueado";

    }


    if (
      financialStatus === "Em atraso"
    ) {

      return "Bloqueado";

    }


    if (
      financialStatus === "Em dia"
    ) {

      return "Liberado";

    }


    return "Verificar";

  }


  const rows =
    studentsCache.filter(
      student => {

        const matchesStatus =
          statusFilter === "todos" ||
          student.status ===
            statusFilter;


        const searchText = [

          student.nome,

          student.matricula,

          student.cpf,

          student.telefone

        ]
          .join(" ")
          .toLowerCase();


        const matchesSearch =
          searchText.includes(
            search
          );


        return (
          matchesStatus &&
          matchesSearch
        );

      }
    );


  /*
    Indicadores
  */

  const today =
    new Date()
      .toISOString()
      .substring(0, 10);


  const accessesToday =
    accessCache.filter(
      access =>
        access.ocorrido_em &&
        access.ocorrido_em
          .substring(0, 10) ===
          today
    ).length;


  const activeStudents =
    studentsCache.filter(
      student =>
        student.status === "ativo"
    ).length;


  let liberated = 0;

  let blocked = 0;


  studentsCache.forEach(
    student => {

      const financialStatus =
        getFinancialStatus(
          student.id
        );


      const accessStatus =
        getAccessStatus(
          student,
          financialStatus
        );


      if (
        accessStatus ===
        "Liberado"
      ) {

        liberated++;

      }


      if (
        accessStatus ===
        "Bloqueado"
      ) {

        blocked++;

      }

    }
  );


  const totalElement =
    document.getElementById(
      "accessTotal"
    );

  const activeElement =
    document.getElementById(
      "accessAlunosAtivos"
    );

  const liberatedElement =
    document.getElementById(
      "accessLiberados"
    );

  const blockedElement =
    document.getElementById(
      "accessBloqueados"
    );


  if (totalElement) {

    totalElement.textContent =
      accessesToday;

  }


  if (activeElement) {

    activeElement.textContent =
      activeStudents;

  }


  if (liberatedElement) {

    liberatedElement.textContent =
      liberated;

  }


  if (blockedElement) {

    blockedElement.textContent =
      blocked;

  }


  /*
    Tabela
  */

  table.innerHTML = `

    <table class="table">

      <thead>

        <tr>

          <th>Matrícula</th>

          <th>Aluno</th>

          <th>Status</th>

          <th>Situação financeira</th>

          <th>Último acesso</th>

          <th>Acesso</th>

        </tr>

      </thead>

      <tbody>

        ${
          rows
            .map(student => {

              const financialStatus =
                getFinancialStatus(
                  student.id
                );


              const accessStatus =
                getAccessStatus(
                  student,
                  financialStatus
                );


              const lastAccess =
                latestAccess[
                  student.id
                ];


              let lastAccessText =
                "Nunca";


              if (
                lastAccess &&
                lastAccess.ocorrido_em
              ) {

                lastAccessText =
                  new Date(
                    lastAccess.ocorrido_em
                  ).toLocaleString(
                    "pt-BR"
                  );

              }


              return `

                <tr>

                  <td>
                    ${esc(
                      student.matricula ||
                      "—"
                    )}
                  </td>

                  <td>
                    <strong>
                      ${esc(
                        student.nome
                      )}
                    </strong>
                  </td>

                  <td>

                    <span
                      class="status ${
                        student.status
                      }"
                    >
                      ${esc(
                        student.status
                      )}
                    </span>

                  </td>

                  <td>
                    ${esc(
                      financialStatus
                    )}
                  </td>

                  <td>
                    ${esc(
                      lastAccessText
                    )}
                  </td>

                  <td>

                    <span
                      class="status ${
                        accessStatus ===
                        "Liberado"
                          ? "ativo"
                          : accessStatus ===
                            "Bloqueado"
                          ? "inativo"
                          : ""
                      }"
                    >
                      ${accessStatus}
                    </span>

                  </td>

                </tr>

              `;

            })
            .join("")
        }

        ${
          rows.length === 0
            ? `
              <tr>

                <td colspan="6">

                  Nenhum aluno encontrado.

                </td>

              </tr>
            `
            : ""
        }

      </tbody>

    </table>

  `;
  /*
    Histórico de acessos
  */

  const historyTable =
    document.getElementById(
      "accessHistoryTable"
    );

  if (historyTable) {

    const historySearch =
      document
        .getElementById(
          "accessHistorySearch"
        )
        ?.value
        .trim()
        .toLowerCase() || "";

    const historyStart =
      document
        .getElementById(
          "accessHistoryStart"
        )
        ?.value || "";

    const historyEnd =
      document
        .getElementById(
          "accessHistoryEnd"
        )
        ?.value || "";

    const historyType =
      document
        .getElementById(
          "accessHistoryType"
        )
        ?.value || "todos";

    const historyResult =
      document
        .getElementById(
          "accessHistoryResult"
        )
        ?.value || "todos";


    const historyRows =
      [...accessCache]
        .sort(
          (a, b) =>
            new Date(b.ocorrido_em) -
            new Date(a.ocorrido_em)
        )
        .filter(access => {

          const student =
            studentsCache.find(
              student =>
                student.id ===
                access.aluno_id
            );

          const studentName =
            student?.nome ||
            "";

          const studentMatricula =
            String(
              student?.matricula ||
              ""
            );

          const searchMatch =
            !historySearch ||
            studentName
              .toLowerCase()
              .includes(
                historySearch
              ) ||
            studentMatricula
              .toLowerCase()
              .includes(
                historySearch
              );

          const accessDate =
            access.ocorrido_em
              ? new Date(
                  access.ocorrido_em
                )
                  .toISOString()
                  .slice(0, 10)
              : "";

          const startMatch =
            !historyStart ||
            (
              accessDate &&
              accessDate >=
                historyStart
            );

          const endMatch =
            !historyEnd ||
            (
              accessDate &&
              accessDate <=
                historyEnd
            );

          const typeMatch =
            historyType === "todos" ||
            access.tipo ===
              historyType;

          const resultMatch =
            historyResult === "todos" ||
            access.resultado ===
              historyResult;

          return (
            searchMatch &&
            startMatch &&
            endMatch &&
            typeMatch &&
            resultMatch
          );

        })
        .map(access => {

          const student =
            studentsCache.find(
              student =>
                student.id ===
                access.aluno_id
            );

          const studentName =
            student?.nome ||
            "Aluno não encontrado";

          const studentMatricula =
            student?.matricula ||
            "—";

          const occurredAt =
            access.ocorrido_em
              ? new Date(
                  access.ocorrido_em
                ).toLocaleString(
                  "pt-BR"
                )
              : "—";

          const type =
            access.tipo === "saida"
              ? "Saída"
              : "Entrada";

          const result =
            access.resultado ===
            "bloqueado"
              ? "Bloqueado"
              : "Liberado";

          const resultClass =
            access.resultado ===
            "bloqueado"
              ? "inativo"
              : "ativo";

          const equipment =
            access.equipamento ||
            "—";

          return `
            <tr>

              <td>
                ${esc(occurredAt)}
              </td>

              <td>
                ${esc(
                  studentMatricula
                )}
              </td>

              <td>
                <strong>
                  ${esc(
                    studentName
                  )}
                </strong>
              </td>

              <td>
                ${esc(type)}
              </td>

              <td>
                <span
                  class="status ${resultClass}"
                >
                  ${esc(result)}
                </span>
              </td>

              <td>
                ${esc(equipment)}
              </td>

            </tr>
          `;
        })
        .join("");

    historyTable.innerHTML = `
      <table class="table">

        <thead>
          <tr>
            <th>Data/Hora</th>
            <th>Matrícula</th>
            <th>Aluno</th>
            <th>Tipo</th>
            <th>Resultado</th>
            <th>Equipamento</th>
          </tr>
        </thead>

        <tbody>

  ${
    historyRows ||
    `
      <tr>
        <td colspan="6">
          Nenhum acesso encontrado para os filtros selecionados.
        </td>
      </tr>
    `
  }

</tbody>

        </tbody>

      </table>
    `;
  }
}


/* Filtros do Acessos */

document
  .getElementById("accessSearch")
  ?.addEventListener(
    "input",
    renderAccesses
  );


document
  .getElementById("accessStatus")
  ?.addEventListener(
    "change",
    renderAccesses
  );

/* =========================================================
   FILTROS DO HISTÓRICO DE ACESSOS
   ========================================================= */

document
  .getElementById("accessHistorySearch")
  ?.addEventListener(
    "input",
    renderAccesses
  );

document
  .getElementById("accessHistoryStart")
  ?.addEventListener(
    "change",
    renderAccesses
  );

document
  .getElementById("accessHistoryEnd")
  ?.addEventListener(
    "change",
    renderAccesses
  );

document
  .getElementById("accessHistoryType")
  ?.addEventListener(
    "change",
    renderAccesses
  );

document
  .getElementById("accessHistoryResult")
  ?.addEventListener(
    "change",
    renderAccesses
  );

/* =========================================================
   FINANCEIRO - CONTROLE DE LANÇAMENTOS
   ========================================================= */

let financeCache = [];

let financeRevenueChart = null;
let financeStatusChart = null;
let financePaymentChart = null;

/* Abrir modal de novo lançamento */

function openFinanceModal() {

  const modal = document.getElementById("financeModal");

  if (!modal) return;

  document.getElementById("financeForm")?.reset();

  const id = document.getElementById("financeId");

  if (id) id.value = "";

  loadFinanceStudents();

  modal.classList.remove("hidden");
}


/* Fechar modal financeiro */
function closeFinanceModal() {

  const modal = document.getElementById("financeModal");

  if (!modal) return;

  modal.classList.add("hidden");

  document.getElementById("financeForm")?.reset();
}


/* Carregar alunos no campo de seleção */

async function loadFinanceStudents() {

  const select =
    document.getElementById("financeStudent");

  if (!select) return;

  select.innerHTML = `
    <option value="">
      Selecione o aluno
    </option>
  `;

  let planos = [];

  if (demoMode) {

    planos = [
      {
        nome: "Mensal",
        valor: 70
      },
      {
        nome: "Trimestral",
        valor: 180
      },
      {
        nome: "Semestral",
        valor: 350
      },
      {
        nome: "Anual",
        valor: 700
      }
    ];

  } else {

    const result =
      await client
        .from("planos")
        .select("id, nome, valor")
        .eq("ativo", true)
        .order("valor", {
          ascending: true
        });

    if (result.error) {

      console.error(
        "Erro ao carregar planos:",
        result.error
      );

      return;
    }

    planos = result.data || [];
  }

  studentsCache
    .filter(
      student =>
        String(student.status || "").toLowerCase() ===
        "ativo"
    )
    .sort((a, b) =>
      String(a.nome || "").localeCompare(
        String(b.nome || ""),
        "pt-BR"
      )
    )
    .forEach(student => {

      const option =
        document.createElement("option");

      option.value = student.id;

      option.textContent =
        student.nome +
        (
          student.cpf
            ? ` — ${student.cpf}`
            : ""
        );

      const plano =
        planos.find(
          item =>
            String(item.id) ===
            String(student.plano_id)
        );

      if (plano) {

        option.dataset.planoId =
          plano.id;

        option.dataset.planoNome =
          plano.nome;

        option.dataset.planoValor =
          plano.valor;

      }

      select.appendChild(option);

    });
}

/* Inicializar eventos do Financeiro */
function initFinanceEvents() {

  const newFinanceBtn =
    document.getElementById("newFinanceBtn");

  const closeFinanceBtn =
    document.getElementById("closeFinanceModal");

  const cancelFinanceBtn =
    document.getElementById("cancelFinanceModal");

  const financeForm =
    document.getElementById("financeForm");


  if (newFinanceBtn) {

    newFinanceBtn.onclick = openFinanceModal;

  }


  if (closeFinanceBtn) {

    closeFinanceBtn.onclick = closeFinanceModal;

  }


  if (cancelFinanceBtn) {

    cancelFinanceBtn.onclick = closeFinanceModal;

  }


  if (financeForm) {

    financeForm.addEventListener(
      "submit",
      saveFinance
    );

  }

}


/* Salvar lançamento */
async function saveFinance(event) {

  event.preventDefault();

  const alunoId =
    document.getElementById("financeStudent")?.value || null;

  const tipo =
    document.getElementById("financeTipo")?.value || "mensalidade";

  const status =
    document.getElementById("financeStatusForm")?.value || "aberto";

  const descricao =
    document.getElementById("financeDescricao")?.value.trim() || null;

  const valor =
    Number(
      document.getElementById("financeValor")?.value || 0
    );

  const vencimento =
    document.getElementById("financeVencimento")?.value || null;

  const pagamento =
    document.getElementById("financePagamento")?.value || null;

  const formaPagamento =
    document.getElementById("financeFormaPagamento")?.value || null;

  const observacoes =
    document.getElementById("financeObservacoes")?.value.trim() || null;


  if (!alunoId) {

    return toast(
      "Selecione o aluno.",
      true
    );

  }


  if (!valor || valor <= 0) {

    return toast(
      "Informe um valor válido.",
      true
    );

  }


  const payload = {

    aluno_id: alunoId,

    tipo,

    status,

    descricao,

    valor,

    data_vencimento: vencimento,

    data_pagamento: pagamento,

    forma_pagamento: formaPagamento,

    observacoes

  };


  /* MODO DEMONSTRAÇÃO */

  if (demoMode) {
  financeCache.unshift({
    id: crypto.randomUUID(),
    ...payload,
    criado_em: new Date().toISOString()
  });

  localStorage.setItem(
    "thm_demo_financeiro",
    JSON.stringify(financeCache)
  );

  closeFinanceModal();
  renderFinance();

  return toast(
    "Lançamento salvo na demonstração."
  );
}

  /* SUPABASE */

const financeId =
  document.getElementById("financeId")?.value || "";

let result;

if (financeId) {

  result =
    await client
      .from("financeiro")
      .update(payload)
      .eq("id", financeId)
      .select()
      .single();

} else {

  result =
    await client
      .from("financeiro")
      .insert(payload)
      .select()
      .single();

}


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


/* Carregar financeiro */
async function loadFinance() {

  if (demoMode) {

financeCache =
  JSON.parse(
    localStorage.getItem(
      "thm_demo_financeiro"
    ) || "[]"
  );

renderFinance();
renderFinanceCharts();
return;

  }


  const result =
    await client
      .from("financeiro")
      .select("*")
      .order(
        "data_vencimento",
        {
          ascending: false
        }
      );


  if (result.error) {

    console.error(
      "Erro ao carregar financeiro:",
      result.error
    );

    return;

  }


  financeCache =
    result.data || [];

  renderFinance();
renderFinanceCharts();
}


/* Renderizar financeiro */
function renderFinance() {

  const table =
    document.getElementById("financeTable");

  if (!table) return;


  let totalRecebido = 0;

  let totalAberto = 0;

  let totalAtrasado = 0;


  financeCache.forEach(item => {

    const valor =
      Number(item.valor || 0);

    if (item.status === "pago") {

      totalRecebido += valor;

    }

    if (item.status === "aberto") {

      totalAberto += valor;

    }

    if (item.status === "atrasado") {

      totalAtrasado += valor;

    }

  });


  const total =
    document.getElementById("financeTotal");

  const lancamentos =
    document.getElementById("financeLancamentos");

  const aberto =
    document.getElementById("financeAberto");

  const atrasado =
    document.getElementById("financeAtrasado");


  if (total) {

    total.textContent =
      formatMoney(totalRecebido);

  }


  if (lancamentos) {

    lancamentos.textContent =
      financeCache.length;

  }


  if (aberto) {

    aberto.textContent =
      formatMoney(totalAberto);

  }


  if (atrasado) {

    atrasado.textContent =
      formatMoney(totalAtrasado);

  }


  const search =
    (
      document.getElementById("financeSearch")
        ?.value || ""
    )
      .toLowerCase();


  const statusFilter =
    document.getElementById("financeStatus")
      ?.value || "todos";


  const rows =
    financeCache.filter(item => {

      const text =
        [
          item.descricao,
          item.tipo,
          item.status
        ]
          .join(" ")
          .toLowerCase();


      const matchSearch =
        !search ||
        text.includes(search);


      const matchStatus =
        statusFilter === "todos" ||
        item.status === statusFilter;


      return (
        matchSearch &&
        matchStatus
      );

    });


  if (!rows.length) {

    table.innerHTML = `
      <table class="table">

        <thead>

          <tr>
            <th>Aluno</th>
            <th>Descrição</th>
            <th>Vencimento</th>
            <th>Valor</th>
            <th>Status</th>
            <th>Pagamento</th>
            <th>Ações</th>
          </tr>

        </thead>

        <tbody>

          <tr>

            <td colspan="7">
              Nenhum lançamento cadastrado.
            </td>

          </tr>

        </tbody>

      </table>
    `;

    return;

  }


  table.innerHTML = `

    <table class="table">

      <thead>

        <tr>
          <th>Aluno</th>
          <th>Descrição</th>
          <th>Vencimento</th>
          <th>Valor</th>
          <th>Status</th>
          <th>Pagamento</th>
          <th>Ações</th>
        </tr>

      </thead>

      <tbody>

        ${rows.map(item => {

          const student =
            studentsCache.find(
              student =>
                String(student.id) ===
                String(item.aluno_id)
            );


          const studentName =
            student?.nome ||
            "Aluno não encontrado";


          return `

            <tr>

              <td>
                <strong>
                  ${esc(studentName)}
                </strong>
              </td>

              <td>
                ${esc(item.descricao || item.tipo || "—")}
              </td>

              <td>
                ${formatDate(item.data_vencimento)}
              </td>

              <td>
                ${formatMoney(item.valor)}
              </td>

              <td>
                <span class="status ${esc(item.status)}">
                  ${esc(item.status || "—")}
                </span>
              </td>

              <td>
                ${formatDate(item.data_pagamento)}
              </td>

              <td>
                <button
  class="mini"
  type="button"
  onclick="editFinance('${item.id}')"
>
  Editar
</button>

<button
  class="mini"
  type="button"
  onclick="deleteFinance('${item.id}')"
>
  Excluir
</button>
              </td>

            </tr>

          `;

        }).join("")}

      </tbody>

    </table>

  `;

}


/* Formatação monetária */
function formatMoney(value) {

  return Number(value || 0).toLocaleString(
    "pt-BR",
    {
      style: "currency",
      currency: "BRL"
    }
  );

}


/* Formatação de data */
function formatDate(value) {

  if (!value) return "—";

  const date =
    new Date(value + "T00:00:00");

  if (Number.isNaN(date.getTime())) {

    return "—";

  }

  return date.toLocaleDateString(
    "pt-BR"
  );

}


/* Excluir lançamento */
async function deleteFinance(id) {

  if (
    !confirm(
      "Deseja realmente excluir este lançamento?"
    )
  ) {

    return;

  }


  if (demoMode) {

    financeCache =
      financeCache.filter(
        item => item.id !== id
      );

    localStorage.setItem(
      "thm_demo_financeiro",
      JSON.stringify(financeCache)
    );

    renderFinance();

    return toast(
      "Lançamento excluído."
    );

  }


  const result =
    await client
      .from("financeiro")
      .delete()
      .eq("id", id);


  if (result.error) {

    return toast(
      result.error.message,
      true
    );

  }


  await loadFinance();

  toast(
    "Lançamento excluído."
  );

}
/* Editar lançamento */
function editFinance(id) {

  const item =
    financeCache.find(
      finance =>
        String(finance.id) === String(id)
    );

  if (!item) {

    return toast(
      "Lançamento não encontrado.",
      true
    );

  }

  const modal =
    document.getElementById("financeModal");

  if (!modal) return;

  document.getElementById("financeId").value =
    item.id || "";

  document.getElementById("financeStudent").value =
    item.aluno_id || "";

  document.getElementById("financeTipo").value =
    item.tipo || "mensalidade";

  document.getElementById("financeStatusForm").value =
    item.status || "aberto";

  document.getElementById("financeDescricao").value =
    item.descricao || "";

  document.getElementById("financeValor").value =
    item.valor || "";

  document.getElementById("financeVencimento").value =
    item.data_vencimento || "";

  document.getElementById("financePagamento").value =
    item.data_pagamento || "";

  document.getElementById("financeFormaPagamento").value =
    item.forma_pagamento || "";

  document.getElementById("financeObservacoes").value =
    item.observacoes || "";

  const title =
    document.querySelector(
      "#financeModal h2"
    );

  if (title) {

    title.textContent =
      "Editar lançamento";

  }

  loadFinanceStudents();

  document.getElementById("financeStudent").value =
    item.aluno_id || "";

  modal.classList.remove("hidden");

}

// Mostrar plano atual e preencher descrição

document
  .getElementById("financeStudent")
  ?.addEventListener(
    "change",
    event => {

      const planElement =
        document.getElementById(
          "financeStudentPlan"
        );

      const descriptionElement =
        document.getElementById(
          "financeDescricao"
        );

      const valueElement =
        document.getElementById(
          "financeValor"
        );

      if (!planElement) return;

      const selectedOption =
        event.target.options[
          event.target.selectedIndex
        ];

      if (
        !selectedOption ||
        !selectedOption.value
      ) {

        planElement.textContent = "";

        if (descriptionElement) {
          descriptionElement.value = "";
        }

        if (valueElement) {
          valueElement.value = "";
        }

        return;
      }

      const student =
        studentsCache.find(
          item =>
            String(item.id) ===
            String(event.target.value)
        );

      if (!student) {

        planElement.textContent =
          "Aluno não encontrado.";

        return;
      }

      const planoNome =
        selectedOption.dataset.planoNome || "";

      const planoValor =
        Number(
          selectedOption.dataset.planoValor || 0
        );

      if (planoNome) {

        planElement.textContent =
          `Plano atual: ${planoNome}`;

        if (descriptionElement) {

          descriptionElement.value =
            `Mensalidade — ${planoNome}`;
        }

        if (valueElement) {

          valueElement.value =
            planoValor.toFixed(2);
        }

      } else {

        planElement.textContent =
          "Plano não informado";

        if (descriptionElement) {
          descriptionElement.value = "";
        }

        if (valueElement) {
          valueElement.value = "";
        }
      }
    }
  );
/* Filtros */
document
  .getElementById("financeSearch")
  ?.addEventListener(
    "input",
    renderFinance
  );


document
  .getElementById("financeStatus")
  ?.addEventListener(
    "change",
    renderFinance
  );


/* Inicialização */
initFinanceEvents();

// =========================================================
// DASHBOARD FINANCEIRO - GRÁFICOS
// =========================================================

function renderFinanceCharts() {

  const revenueCanvas =
    document.getElementById("financeRevenueChart");

  const statusCanvas =
    document.getElementById("financeStatusChart");

  const paymentCanvas =
    document.getElementById("financePaymentChart");

  if (
    !revenueCanvas ||
    !statusCanvas ||
    !paymentCanvas
  ) {
    return;
  }

  // -------------------------------------------------------
  // RECEITA POR MÊS
  // -------------------------------------------------------

  const monthlyData = {};

  financeCache.forEach(item => {

    if (item.status !== "pago") {
      return;
    }

    if (!item.data_pagamento) {
      return;
    }

    const date =
      new Date(item.data_pagamento + "T00:00:00");

    if (Number.isNaN(date.getTime())) {
      return;
    }

    const monthKey =
      `${date.getFullYear()}-${String(
        date.getMonth() + 1
      ).padStart(2, "0")}`;

    monthlyData[monthKey] =
      (monthlyData[monthKey] || 0) +
      Number(item.valor || 0);
  });

  const monthKeys =
    Object.keys(monthlyData).sort();

  const monthLabels =
    monthKeys.map(key => {

      const [year, month] =
        key.split("-");

      const date =
        new Date(
          Number(year),
          Number(month) - 1,
          1
        );

      return date.toLocaleDateString(
        "pt-BR",
        {
          month: "short",
          year: "numeric"
        }
      );
    });

  const monthlyValues =
    monthKeys.map(
      key => monthlyData[key]
    );

  // -------------------------------------------------------
  // DESTRUIR GRÁFICOS ANTERIORES
  // -------------------------------------------------------

  if (financeRevenueChart) {
    financeRevenueChart.destroy();
  }

  if (financeStatusChart) {
    financeStatusChart.destroy();
  }

  if (financePaymentChart) {
    financePaymentChart.destroy();
  }

  // -------------------------------------------------------
  // GRÁFICO DE RECEITA
  // -------------------------------------------------------

  financeRevenueChart =
    new Chart(revenueCanvas, {

      type: "bar",

      data: {
        labels: monthLabels,

        datasets: [
          {
            label: "Receita",
            data: monthlyValues,
            borderWidth: 1
          }
        ]
      },

      options: {
        responsive: true,
        maintainAspectRatio: false,

        plugins: {
          legend: {
            display: false
          },

          tooltip: {
            callbacks: {
              label: context => {

                return `${context.dataset.label}: ${formatMoney(
                  context.raw
                )}`;

              }
            }
          }
        }
      }
    });

  // -------------------------------------------------------
  // STATUS DOS LANÇAMENTOS
  // -------------------------------------------------------

  const statusData = {
    pago: 0,
    aberto: 0,
    atrasado: 0,
    cancelado: 0
  };

  financeCache.forEach(item => {

    const status =
      item.status || "aberto";

    if (
      Object.prototype.hasOwnProperty.call(
        statusData,
        status
      )
    ) {

      statusData[status] +=
        Number(item.valor || 0);

    }

  });

  financeStatusChart =
    new Chart(statusCanvas, {

      type: "doughnut",

      data: {

        labels: [
          "Pago",
          "Aberto",
          "Atrasado",
          "Cancelado"
        ],

        datasets: [
          {
            data: [
              statusData.pago,
              statusData.aberto,
              statusData.atrasado,
              statusData.cancelado
            ],
            borderWidth: 1
          }
        ]
      },

      options: {

        responsive: true,
        maintainAspectRatio: false,

        plugins: {

          legend: {
            position: "bottom"
          },

          tooltip: {

            callbacks: {

              label: context => {

                return `${context.label}: ${formatMoney(
                  context.raw
                )}`;

              }

            }

          }

        }

      }

    });

  // -------------------------------------------------------
  // FORMAS DE PAGAMENTO
  // -------------------------------------------------------

  const paymentData = {};

  financeCache.forEach(item => {

    if (item.status !== "pago") {
      return;
    }

    const forma =
      item.forma_pagamento ||
      "Não informado";

    paymentData[forma] =
      (paymentData[forma] || 0) +
      Number(item.valor || 0);

  });

  const paymentLabels =
    Object.keys(paymentData);

  const paymentValues =
    paymentLabels.map(
      key => paymentData[key]
    );

  financePaymentChart =
    new Chart(paymentCanvas, {

      type: "doughnut",

      data: {

        labels: paymentLabels,

        datasets: [
          {
            data: paymentValues,
            borderWidth: 1
          }
        ]
      },

      options: {

        responsive: true,
        maintainAspectRatio: false,

        plugins: {

          legend: {
            position: "bottom"
          },

          tooltip: {

            callbacks: {

              label: context => {

                return `${context.label}: ${formatMoney(
                  context.raw
                )}`;

              }

            }

          }

        }

      }

    });

}