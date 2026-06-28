/**
 * VELTRIX - Sistema de Agendamento Inteligente
 * Módulo: Conexão Central Firebase (firebase-config.js)
 */

// 1. Configuração oficial do seu projeto Google Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCU8LKhLYIvhBZ4Lq0pBf7-VBKyYEF3cXg",
  authDomain: "veltrix-agenda.firebaseapp.com",
  projectId: "veltrix-agenda",
  storageBucket: "veltrix-agenda.firebasestorage.app",
  messagingSenderId: "73227155396",
  appId: "1:73227155396:web:1c3a031abbbf3002c69691"
};

// 2. Inicializa o Firebase usando a janela global do navegador (compatível com GitHub Pages)
firebase.initializeApp(firebaseConfig);

// 3. Cria os atalhos para os serviços que vamos usar
const db = firebase.firestore(); // Nosso Banco de Dados em tempo real
const auth = firebase.auth();   // Nosso Sistema de usuários seguro

console.log("☁️ VELTRIX conectado com sucesso ao Firebase!");
