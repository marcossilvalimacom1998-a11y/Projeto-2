document.addEventListener('DOMContentLoaded', async () => {
  const container = document.getElementById('armarios-valores');
  
  // Carregar do Banco de Dados
  const dadosBanco = await window.api.getValores();
  const armarios = {};
  dadosBanco.forEach(item => {
      // Filtra apenas os que estão guardados para exibir na grade ativa
      if(item.status === 'guardado') armarios[item.id] = item;
  });

  function criarArmarios() {
    container.innerHTML = '';
    for (let i = 1; i <= 300; i++) {
      const div = document.createElement('div');
      div.className = 'armario';
      div.id = `valor-${i}`;

      div.innerHTML = `
        <h3>Armário ${i}</h3>
        <input type="text" id="nome-valor-${i}" placeholder="Nome do Paciente" autocomplete="off">
        <input type="text" id="prontuario-valor-${i}" placeholder="Prontuário" autocomplete="off">
        <input type="text" id="itens-valor-${i}" placeholder="Itens Guardados" autocomplete="off">
        <input type="text" id="devolver-valor-${i}" placeholder="Devolvido a">
        <div class="botoes">
          <button onclick="window.guardarValor(${i})">📦 Guardar</button>
          <button onclick="window.devolverValor(${i})">✅ Devolvido</button>
          <button onclick="window.historicoValor(${i})">📜 Histórico</button>
        </div>
      `;
      container.appendChild(div);

      if (armarios[i]) {
        document.getElementById(`nome-valor-${i}`).value = armarios[i].nome;
        document.getElementById(`prontuario-valor-${i}`).value = armarios[i].prontuario;
        document.getElementById(`itens-valor-${i}`).value = armarios[i].itens;
        div.classList.add('guardado');
      }
    }
  }

  window.guardarValor = async (id) => {
    const nome = document.getElementById(`nome-valor-${id}`).value.trim();
    const prontuario = document.getElementById(`prontuario-valor-${id}`).value.trim();
    const itens = document.getElementById(`itens-valor-${id}`).value.trim();
    
    if (!nome || !prontuario || !itens) {
      alert('Preencha todos os campos.');
      return;
    }

    const dados = { id, nome, prontuario, itens, data: Date.now() };
    await window.api.saveValor(dados);
    await window.api.addHistorico('valor', id, 'Guardou', dados);
    
    // Atualiza localmente para feedback rápido
    armarios[id] = dados;
    document.getElementById(`valor-${id}`).classList.add('guardado');
    alert('Item guardado com sucesso!');
  };

  window.devolverValor = async (id) => {
    const devolverPara = document.getElementById(`devolver-valor-${id}`).value.trim();
    if (!devolverPara) {
      alert('Preencha "Devolvido a" antes de finalizar.');
      return;
    }

    const dados = { id, status: 'devolvido', devolver: devolverPara };
    await window.api.saveValor(dados); // Atualiza status no banco
    await window.api.addHistorico('valor', id, 'Devolveu', { ...armarios[id], devolvido_a: devolverPara });
    
    // Limpa UI
    delete armarios[id];
    criarArmarios();
  };

  window.historicoValor = (id) => window.consultarHistoricoGeral('valor', id); // Usa função genérica se criar, ou adapte a do script.js
  
  criarArmarios();
});