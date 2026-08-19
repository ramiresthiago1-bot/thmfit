const {createClient}=window.supabase;

const client=createClient(
  THM_CONFIG.SUPABASE_URL,
  THM_CONFIG.SUPABASE_PUBLISHABLE_KEY,
  {
    auth:{
      persistSession:true,
      autoRefreshToken:true,
      detectSessionInUrl:true
    }
  }
);

let demoMode=false;
let studentsCache=[];

const $=id=>document.getElementById(id);

function toast(m,e=false){
  const x=$("toast");
  x.textContent=m;
  x.className=`toast show${e?" error":""}`;
  setTimeout(()=>x.className="toast",3000);
}

function esc(v){
  return String(v??"")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function showApp(label){
  $("loginScreen").classList.add("hidden");
  $("app").classList.remove("hidden");
  $("userLabel").textContent=label;
  goTo("dashboard");
  loadAll();
}

function goTo(page){

  document.querySelectorAll(".page")
    .forEach(x=>x.classList.add("hidden"));

  $(`${page}Page`)?.classList.remove("hidden");

  document.querySelectorAll("[data-page]")
    .forEach(x=>{
      x.classList.toggle(
        "active",
        x.dataset.page===page
      );
    });

  $("pageTitle").textContent={
    dashboard:"Início",
    alunos:"Alunos",
    financeiro:"Financeiro",
    acessos:"Acessos",
    comercial:"Comercial",
    treinos:"Treinos",
    avaliacoes:"Avaliações",
    relatorios:"Relatórios"
  }[page]||page;

  if(page==="alunos"){
    renderStudents();
  }
}

async function loadAll(){

  if(demoMode){

    studentsCache=JSON.parse(
      localStorage.getItem(
        "thm_demo_students"
      )||"[]"
    );

    updateStats();
    renderStudents();
    renderRecent();

    return;
  }

  const [s,f,a,t]=await Promise.all([

    client.from("alunos").select(`
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
      responsavel,
      telefone_responsavel,
      cep,
      estado,
      rua,
      numero,
      complemento,
      bairro,
      cidade
    `).order("nome"),

    client.from("financeiro")
      .select("id",{count:"exact",head:true}),

    client.from("acessos")
      .select("id",{count:"exact",head:true}),

    client.from("treinos")
      .select("id",{count:"exact",head:true})
  ]);

  if(s.error){
    return toast(
      s.error.message,
      true
    );
  }

  studentsCache=s.data||[];

  $("statAlunos").textContent=
    studentsCache.filter(
      x=>x.status==="ativo"
    ).length;

  $("statFinanceiro").textContent=
    f.count??0;

  $("statAcessos").textContent=
    a.count??0;

  $("statTreinos").textContent=
    t.count??0;

  renderStudents();
  renderRecent();
}

function updateStats(){

  $("statAlunos").textContent=
    studentsCache.filter(
      x=>x.status==="ativo"
    ).length;

  [
    "statFinanceiro",
    "statAcessos",
    "statTreinos"
  ].forEach(
    id=>$(id).textContent="—"
  );
}

function renderRecent(){

  $("recentStudents").innerHTML=
    studentsCache.slice(0,5).map(s=>`

      <div class="simple-item">

        <span>
          ${esc(s.nome)}
        </span>

        <span class="status ${s.status}">
          ${esc(s.status)}
        </span>

      </div>

    `).join("")
    ||
    `<div class="simple-item">
      Nenhum aluno cadastrado.
    </div>`;
}

function renderStudents(){

  const q=
    ($("studentSearch")?.value||"")
      .toLowerCase();

  const st=
    $("studentStatus")?.value||"todos";

  const rows=studentsCache.filter(s=>
    (st==="todos"||s.status===st) &&
    [s.nome,s.cpf,s.telefone]
      .join(" ")
      .toLowerCase()
      .includes(q)
  );

  $("studentsTable").innerHTML=`

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
          rows.map(s=>`

            <tr>

              <td>
                <strong>
                  ${esc(s.nome)}
                </strong>
              </td>

              <td>
                ${esc(s.cpf||"—")}
              </td>

              <td>
                ${esc(s.telefone||"—")}
              </td>

              <td>
                ${esc(s.plano||"—")}
              </td>

              <td>

                <span class="status ${s.status}">
                  ${esc(s.status)}
                </span>

              </td>

              <td>
                ${s.ciclo??1}
              </td>

              <td>

                <button
                  class="mini"
                  data-edit="${s.id}"
                >
                  Editar
                </button>

                ${
                  s.status==="inativo"
                  ?
                  `<button
                    class="mini"
                    data-reuse="${s.id}"
                  >
                    ♻ Reaproveitar
                  </button>`
                  :
                  ""
                }

              </td>

            </tr>

          `).join("")
        }

      </tbody>

    </table>
  `;

  document.querySelectorAll(
    "[data-edit]"
  ).forEach(
    b=>b.onclick=()=>{
      openStudent(b.dataset.edit);
    }
  );

  document.querySelectorAll(
    "[data-reuse]"
  ).forEach(
    b=>b.onclick=()=>{
      reuseStudent(b.dataset.reuse);
    }
  );
}

function closeModal(){

  $("studentModal")
    .classList.add("hidden");

  $("studentForm").reset();

  $("studentId").value="";
}

function openStudent(id){

  const s=
    studentsCache.find(
      x=>x.id===id
    );

  if(!s)return;

  $("studentId").value=s.id;

  $("studentName").value=
    s.nome||"";

  $("studentCpf").value=
    s.cpf||"";

  $("studentPhone").value=
    s.telefone||"";

  $("studentBirth").value=
    s.data_nascimento||"";

  $("studentGoal").value=
    s.objetivo||"";

  $("studentPlan").value=
    s.plano||"";

  $("studentStatusForm").value=
    s.status||"ativo";

  $("studentResponsavel").value=
    s.responsavel||"";

  $("studentTelefoneResponsavel").value=
    s.telefone_responsavel||"";

  $("studentCep").value=
    s.cep||"";

  $("studentEstado").value=
    s.estado||"";

  $("studentRua").value=
    s.rua||"";

  $("studentNumero").value=
    s.numero||"";

  $("studentComplemento").value=
    s.complemento||"";

  $("studentBairro").value=
    s.bairro||"";

  $("studentCidade").value=
    s.cidade||"";

  $("modalTitle").textContent=
    "Editar aluno";

  $("studentModal")
    .classList.remove("hidden");
}

async function saveStudent(e){

  e.preventDefault();

  const id=
    $("studentId").value;

  const p={

    nome:
      $("studentName")
        .value
        .trim(),

    cpf:
      $("studentCpf")
        .value
        .trim()||null,

    telefone:
      $("studentPhone")
        .value
        .trim()||null,

    data_nascimento:
      $("studentBirth")
        .value||null,

    objetivo:
      $("studentGoal")
        .value||null,

    plano:
      $("studentPlan")
        .value
        .trim()||null,

    status:
      $("studentStatusForm")
        .value,

    responsavel:
      $("studentResponsavel")
        .value
        .trim()||null,

    telefone_responsavel:
      $("studentTelefoneResponsavel")
        .value
        .trim()||null,

    cep:
      $("studentCep")
        .value
        .trim()||null,

    estado:
      $("studentEstado")
        .value
        .trim()
        .toUpperCase()||null,

    rua:
      $("studentRua")
        .value
        .trim()||null,

    numero:
      $("studentNumero")
        .value
        .trim()||null,

    complemento:
      $("studentComplemento")
        .value
        .trim()||null,

    bairro:
      $("studentBairro")
        .value
        .trim()||null,

    cidade:
      $("studentCidade")
        .value
        .trim()||null
  };

  if(!p.nome){
    return toast(
      "Informe o nome.",
      true
    );
  }

  if(demoMode){

    if(id){

      studentsCache=
        studentsCache.map(s=>
          s.id===id
          ?
          {...s,...p}
          :
          s
        );

    }else{

      studentsCache=[
        {
          id:crypto.randomUUID(),
          ...p,
          ciclo:1,
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

  const r=id

    ?

    await client
      .from("alunos")
      .update(p)
      .eq("id",id)
      .select()
      .single()

    :

    await client
      .from("alunos")
      .insert({
        ...p,
        ciclo:1
      })
      .select()
      .single();

  if(r.error){
    return toast(
      r.error.message,
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

async function reuseStudent(id){

  const old=
    studentsCache.find(
      x=>x.id===id
    );

  if(!old)return;

  if(
    !confirm(
      `Reaproveitar o cadastro de "${old.nome}"? O histórico anterior será preservado.`
    )
  ){
    return;
  }

  const name=
    prompt(
      "Nome do novo aluno:"
    );

  if(!name?.trim())return;

  const p={

    nome:name.trim(),

    cpf:null,
    telefone:null,
    data_nascimento:null,

    objetivo:null,
    plano:null,

    status:"ativo",

    responsavel:null,
    telefone_responsavel:null,

    cep:null,
    estado:null,
    rua:null,
    numero:null,
    complemento:null,
    bairro:null,
    cidade:null,

    ciclo:
      (old.ciclo||1)+1
  };

  if(demoMode){

    studentsCache.unshift({
      id:crypto.randomUUID(),
      ...p
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

  const r=
    await client
      .from("alunos")
      .insert(p);

  if(r.error){
    return toast(
      r.error.message,
      true
    );
  }

  await loadAll();

  toast(
    "Novo cadastro criado."
  );
}

async function buscarCep(){

  const campo=
    $("studentCep");

  if(!campo)return;

  const cep=
    campo.value
      .replace(/\D/g,"");

  if(cep.length!==8)return;

  campo.value=
    cep.substring(0,5)+
    "-"+
    cep.substring(5);

  try{

    $("studentRua").value="";
    $("studentBairro").value="";
    $("studentCidade").value="";
    $("studentEstado").value="";

    const response=
      await fetch(
        `https://viacep.com.br/ws/${cep}/json/`
      );

    if(!response.ok){
      throw new Error(
        "Não foi possível consultar o CEP."
      );
    }

    const data=
      await response.json();

    if(data.erro){
      return toast(
        "CEP não encontrado.",
        true
      );
    }

    $("studentRua").value=
      data.logradouro||"";

    $("studentBairro").value=
      data.bairro||"";

    $("studentCidade").value=
      data.localidade||"";

    $("studentEstado").value=
      (data.uf||"").toUpperCase();

    $("studentNumero").focus();

    toast(
      "Endereço encontrado."
    );

  }catch(error){

    toast(
      "Não foi possível consultar o CEP.",
      true
    );

    console.error(error);
  }
}

function formatCep(e){

  let v=
    e.target.value
      .replace(/\D/g,"");

  if(v.length>8){
    v=v.substring(0,8);
  }

  if(v.length>5){

    v=
      v.substring(0,5)+
      "-"+
      v.substring(5);
  }

  e.target.value=v;

  if(
    v.replace(/\D/g,"").length===8
  ){
    buscarCep();
  }
}

async function login(e){

  e.preventDefault();

  const {data,error}=
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

  if(error){
    return toast(
      error.message,
      true
    );
  }

  showApp(
    data.user.email
  );
}

async function logout(){

  if(!demoMode){
    await client.auth.signOut();
  }

  demoMode=false;

  $("app")
    .classList.add("hidden");

  $("loginScreen")
    .classList.remove("hidden");

  $("loginPassword").value="";
}

document.addEventListener(
  "click",
  e=>{

    const b=
      e.target.closest(
        "[data-page]"
      );

    if(b){
      goTo(
        b.dataset.page
      );
    }
  }
);

$("loginForm")
  .addEventListener(
    "submit",
    login
  );

$("demoBtn").onclick=()=>{

  demoMode=true;

  showApp(
    "Demonstração"
  );
};

$("logoutBtn")
  .onclick=logout;

$("newStudentBtn").onclick=()=>{

  $("studentForm").reset();

  $("studentId").value="";

  $("modalTitle").textContent=
    "Novo aluno";

  $("studentModal")
    .classList.remove("hidden");
};

$("closeModal")
  .onclick=closeModal;

$("cancelModal")
  .onclick=closeModal;

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

(async()=>{

  const {
    data:{session}
  }=
    await client.auth.getSession();

  if(session){
    showApp(
      session.user.email
    );
  }

})();