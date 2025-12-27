const API = "http://localhost:3000";

let draggedCard = null;

// ================== CARREGAR DO BANCO ==================

fetch(`${API}/board`)
.then(r => r.json())
.then(async data => {

    const board = document.querySelector(".columns");
    board.innerHTML = "";

    // --- SE BANCO ESTIVER VAZIO, CRIA COLUNAS PADRÃO ---
    if(data.columns.length === 0){

        const defaults = [
            {title:"TODAS AS TAREFAS", status:"todo", pos:0},
            {title:"TAREFAS EM PROGRESSO", status:"doing", pos:1},
            {title:"TAREFAS PARA REVISAR", status:"review", pos:2},
            {title:"TAREFAS CONCLUÍDAS", status:"done", pos:3},
        ];

        for(let col of defaults){
            await fetch(`${API}/column`,{
                method:"POST",
                headers:{"Content-Type":"application/json"},
                body:JSON.stringify(col)
            });
        }

        return location.reload();
    }

    // --- CRIAR COLUNAS ---
    data.columns.forEach(col => {

        const column = document.createElement("section");
        column.className = "column";
        column.dataset.status = col.status;
        column.dataset.id = col.id;

        column.innerHTML = `
            <h2 class="column__title">
                ${col.title} (<span class="counter">0</span>)
            </h2>

            <section class="column__cards"></section>
        `;

        board.append(column);

        const cardsArea = column.querySelector(".column__cards");
        const title = column.querySelector(".column__title");

        attachColumnEvents(cardsArea);
        enableRename(title);
    });

    // --- CRIAR TASKS ---
    data.tasks.forEach(task => {

        const card = document.createElement("section");
        card.className = "card";
        card.draggable = true;
        card.dataset.id = task.id;

        card.innerHTML = `
            <span class="delete-btn">×</span>
            <div class="text">${task.text}</div>
        `;

        enableCard(card);

        document
            .querySelector(`.column[data-id="${task.column_id}"] .column__cards`)
            .append(card);
    });

    updateCounters();
});


// ================== DRAG ==================

const dragStart = (event) => draggedCard = event.target;

const dragOver = (event) => event.preventDefault();

const drop = async ({ target }) => {

    if (!target.classList.contains("column__cards")) return;

    target.appendChild(draggedCard);

    // salvar mudança
    await fetch(`${API}/task/${draggedCard.dataset.id}`,{
        method:"PUT",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
            text: draggedCard.querySelector(".text").textContent,
            column_id: target.closest(".column").dataset.id,
            pos: [...target.children].indexOf(draggedCard)
        })
    });

    updateCounters();
};


// ================== CRIAR TAREFA ==================

const createCard = async ({ target }) => {

    if (!target.classList.contains("column__cards")) return;

    // cria no banco primeiro
    await fetch(`${API}/task`,{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
            text:"",
            column_id: target.closest(".column").dataset.id,
            pos: target.children.length
        })
    });

    location.reload();
};


// ================== HABILITAR CARD ==================

function enableCard(card){

    card.addEventListener("dragstart", dragStart);

    card.querySelector(".delete-btn").addEventListener("click", async () => {
        await fetch(`${API}/task/${card.dataset.id}`,{method:"DELETE"});
        card.remove();
        updateCounters();
    });

    const text = card.querySelector(".text");

    card.addEventListener("dblclick", () => {
        text.contentEditable = true;
        text.focus();
    });

    text.addEventListener("focusout", async () => {
        text.contentEditable = false;

        if (!text.textContent.trim()){
            await fetch(`${API}/task/${card.dataset.id}`,{method:"DELETE"});
            card.remove();
        } else{
            await fetch(`${API}/task/${card.dataset.id}`,{
                method:"PUT",
                headers:{"Content-Type":"application/json"},
                body:JSON.stringify({
                    text:text.textContent,
                    column_id: card.closest(".column").dataset.id,
                    pos:[...card.parentNode.children].indexOf(card)
                })
            });
        }

        updateCounters();
    });
}


// ================== ADICIONAR COLUNA ==================

document.getElementById("addColumnBtn").addEventListener("click", async () => {

    await fetch(`${API}/column`,{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
            title:"NOVA COLUNA",
            status:"todo",
            pos:document.querySelectorAll(".column").length
        })
    });

    location.reload();
});


// ================== EVENTOS COLUNA ==================

function attachColumnEvents(column){
    column.addEventListener("dragover", dragOver);
    column.addEventListener("drop", drop);
    column.addEventListener("dblclick", createCard);
}


// ================== CONTADOR ==================

function updateCounters(){
    document.querySelectorAll(".column").forEach(col=>{
        col.querySelector(".counter").textContent =
            col.querySelectorAll(".card").length;
    });
}


// ================== THEME ==================

const themeBtn = document.getElementById("themeToggle");

if(localStorage.getItem("theme")==="dark"){
    document.body.classList.add("dark");
    themeBtn.textContent="☀️";
}

themeBtn.addEventListener("click",()=>{
    document.body.classList.toggle("dark");
    if(document.body.classList.contains("dark")){
        localStorage.setItem("theme","dark");
        themeBtn.textContent="☀️";
    } else {
        localStorage.setItem("theme","light");
        themeBtn.textContent="🌙";
    }
});


// ================== RENOMEAR COLUNA ==================

function enableRename(titleElement){

    const counter = titleElement.querySelector(".counter");

    const getTitleText = () =>
        titleElement.textContent.replace(/\(\s*\d+\s*\)/,"").trim();

    let oldValue = getTitleText();

    titleElement.addEventListener("dblclick",()=>{
        titleElement.contentEditable = true;
        titleElement.focus();
    });

    titleElement.addEventListener("keydown",e=>{
        if(e.key==="Enter"){
            e.preventDefault();
            titleElement.blur();
        }
    });

    titleElement.addEventListener("focusout",async()=>{

        titleElement.contentEditable=false;

        let newTitle = getTitleText();
        if(!newTitle) newTitle = oldValue;

        titleElement.innerHTML =
            `${newTitle} (<span class="counter">${counter.textContent}</span>)`;

        oldValue = newTitle;

        await fetch(`${API}/column/${titleElement.closest(".column").dataset.id}`,{
            method:"PUT",
            headers:{"Content-Type":"application/json"},
            body:JSON.stringify({
                title:newTitle,
                status:titleElement.closest(".column").dataset.status
            })
        });
    });
}


// ================== STATUS COLUNA ==================

document.addEventListener("contextmenu",e=>{

    if(!e.target.classList.contains("column__title")) return;

    e.preventDefault();

    const status = prompt(
        "Definir status:\n1 TODO\n2 DOING\n3 REVIEW\n4 DONE"
    );

    const map = {
        "1":"todo",
        "2":"doing",
        "3":"review",
        "4":"done"
    };

    if(!map[status]) return;

    const column = e.target.closest(".column");
    column.dataset.status = map[status];

    fetch(`${API}/column/${column.dataset.id}`,{
        method:"PUT",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
            title:e.target.textContent,
            status:map[status]
        })
    });
});
