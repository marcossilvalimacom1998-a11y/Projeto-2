const TEMPO_PADRAO = 86400; // 24 horas em segundos
let intervalos = {}; // Armazena os timers ativos

document.addEventListener('DOMContentLoaded', async () => {
  await carregarArmariosTemporizados();
});

async function carregarArmariosTemporizados() {
  const grid = document.getElementById('armarios-tempo');
  if (!grid) return;

  // 1. Busca dados do Banco SQLite
  const dadosBanco = await window.api.getTemporizados();
  const armarios = {};
  dadosBanco.forEach(item => {
      armarios[item.id] = item;
  });

  grid.innerHTML = '';

  for (let i = 1; i <= 40; i++) {
    const div = document.createElement('div');
    div.className = 'armario';
    div.id = `armario-tempo-${i}`;

    div.innerHTML = `
      <h3>Armário ${i}</h3>
      <input type="text" id="nome-tempo-${i}" placeholder="Nome do Acompanhante" autocomplete="off">
      <input type="text" id="prontuario-tempo-${i}" placeholder="Prontuário" autocomplete="off">
      <div class="cronometro" id="cronometro-tempo-${i}">00:00</div>
      <div class="botoes">
        <button onclick="window.emprestarTempo(${i})">📦 Emprestar</button>
        <button onclick="window.devolverTempo(${i})">✅ Devolver</button>
        <button onclick="window.consultarHistoricoTemporario(${i})">📜 Histórico</button>
      </div>
    `;

    grid.appendChild(div);

    // Se estiver emprestado no banco, restaura o estado
    if (armarios[i] && armarios[i].status === 'emprestado') {
      document.getElementById(`nome-tempo-${i}`).value = armarios[i].nome;
      document.getElementById(`prontuario-tempo-${i}`).value = armarios[i].prontuario;
      
      const inicio = armarios[i].inicio_timestamp;
      // Inicia a contagem visual baseada na data salva
      iniciarContagem(i, inicio);
    }
  }
}

window.emprestarTempo = async (id) => {
  const nome = document.getElementById(`nome-tempo-${id}`).value.trim();
  const prontuario = document.getElementById(`prontuario-tempo-${id}`).value.trim();

  if (!nome || !prontuario) {
    alert('Preencha todos os campos para emprestar.');
    return;
  }

  const timestamp = Date.now();
  const dados = { id, nome, prontuario, status: 'emprestado', timestamp };

  try {
      // Salva no Banco
      await window.api.saveTemporizado(dados);
      // Registra Histórico
      await window.api.addHistorico('tempo', id, 'Empréstimo', { nome, prontuario });
      
      iniciarContagem(id, timestamp);
  } catch (err) {
      console.error(err);
      alert('Erro ao salvar empréstimo.');
  }
};

window.devolverTempo = async (id) => {
  const nome = document.getElementById(`nome-tempo-${id}`).value;
  // Só processa se tiver algo preenchido ou se o usuário confirmar
  
  try {
      // Atualiza banco para remover status de empréstimo (ou deletar registro da tabela ativa)
      await window.api.saveTemporizado({ id, status: 'devolvido' });
      await window.api.addHistorico('tempo', id, 'Devolução', { nome: nome || 'Desconhecido' });

      // Limpa UI
      document.getElementById(`nome-tempo-${id}`).value = '';
      document.getElementById(`prontuario-tempo-${id}`).value = '';
      document.getElementById(`cronometro-tempo-${id}`).textContent = '00:00';
      
      if (intervalos[id]) clearInterval(intervalos[id]);

      const armario = document.getElementById(`armario-tempo-${id}`);
      armario.classList.remove('emprestado', 'atrasado');
  } catch (err) {
      console.error(err);
      alert('Erro ao devolver.');
  }
};

function iniciarContagem(id, timestampInicio) {
  const cronometro = document.getElementById(`cronometro-tempo-${id}`);
  const armarioDiv = document.getElementById(`armario-tempo-${id}`);
  
  armarioDiv.classList.add('emprestado');
  armarioDiv.classList.remove('atrasado');

  // Limpa timer anterior se existir
  if (intervalos[id]) clearInterval(intervalos[id]);

  function atualizar() {
    const agora = Date.now();
    const segundosPassados = Math.floor((agora - timestampInicio) / 1000);
    const restante = TEMPO_PADRAO - segundosPassados;

    if (restante <= 0) {
      cronometro.textContent = 'Tempo Esgotado';
      armarioDiv.classList.add('atrasado');
      clearInterval(intervalos[id]);
    } else {
      const dias = Math.floor(restante / (24 * 3600));
      const horas = Math.floor((restante % (24 * 3600)) / 3600);
      const minutos = Math.floor((restante % 3600) / 60);
      const segundos = restante % 60;

      if (dias > 0) {
       cronometro.textContent = `${dias}d ${horas}h ${minutos}m`;
      } else {
         cronometro.textContent = `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}:${String(segundos).padStart(2, '0')}`;
      }
    }
  }

  atualizar();
  intervalos[id] = setInterval(atualizar, 1000);
}

window.consultarHistoricoTemporario = async (id) => {
    try {
        const historico = await window.api.getHistorico('tempo', id);
        if (!historico || historico.length === 0) {
            alert('Nenhum histórico encontrado.');
            return;
        }

        const modal = document.getElementById('modal-historico');
        const texto = document.getElementById('historico-texto');
        
        let conteudo = `Histórico Temporizado Armário ${id}:\n\n`;
        historico.forEach(h => {
            const det = JSON.parse(h.detalhes);
            const dataFormatada = new Date(h.data).toLocaleString('pt-BR');
            conteudo += `[${dataFormatada}] - ${h.acao.toUpperCase()}\n`;
            conteudo += `Nome: ${det.nome || '-'} | Pront: ${det.prontuario || '-'}\n`;
            conteudo += `--------------------------\n`;
        });

        texto.textContent = conteudo;
        modal.style.display = 'block';
    } catch (e) {
        console.error(e);
        alert('Erro ao buscar histórico.');
    }
};

window.filtrarArmariosTemporarios = () => {
  const filtro = document.getElementById('search-tempo').value.toLowerCase().trim();
  for (let i = 1; i <= 40; i++) {
    const nome = (document.getElementById('nome-tempo-' + i)?.value || '').toLowerCase();
    const prontuario = (document.getElementById('prontuario-tempo-' + i)?.value || '').toLowerCase();
    const armario = document.getElementById('armario-tempo-' + i);
    if (!armario) continue;
    
    if (filtro === '' || nome.includes(filtro) || prontuario.includes(filtro)) {
        armario.style.display = 'flex'; // ou block
    } else {
        armario.style.display = 'none';
    }
  }
};

window.exportarTemporarios = () => {
    const dados = [];
    for (let i = 1; i <= 40; i++) {
        const nome = document.getElementById(`nome-tempo-${i}`)?.value;
        if (nome) {
            const cronometro = document.getElementById(`cronometro-tempo-${i}`)?.innerText;
            dados.push({
                Armário: i,
                Nome: nome,
                Prontuário: document.getElementById(`prontuario-tempo-${i}`)?.value,
                Tempo_Restante: cronometro
            });
        }
    }
    if (dados.length === 0) return alert("Nada para exportar.");
    const ws = XLSX.utils.json_to_sheet(dados);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Temporizados");
    XLSX.writeFile(wb, "Acolhimento_Tempo.xlsx");
};

