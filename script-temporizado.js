// Dentro da função que renderiza os armários temporizados carregados do banco:
if (dadosDoBanco.status === 'emprestado') {
   const agora = Date.now();
   const inicio = dadosDoBanco.inicio_timestamp;
   const limite = inicio + (24 * 60 * 60 * 1000); // 24h em ms
   
   if (agora > limite) {
       // Já venceu enquanto o app estava fechado
       div.classList.add('atrasado');
       div.querySelector('.cronometro').innerText = "TEMPO ESGOTADO";
   } else {
       // Ainda está valendo, reinicia o setInterval visual
       iniciarContagemVisual(id, inicio);
   }
}