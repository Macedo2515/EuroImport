-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Tempo de geração: 05/05/2026 às 16:55
-- Versão do servidor: 10.4.32-MariaDB
-- Versão do PHP: 8.1.25

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Banco de dados: `euroimport_db`
--

-- --------------------------------------------------------

--
-- Estrutura para tabela `documentos`
--

CREATE TABLE `documentos` (
  `id` int(11) NOT NULL,
  `negocio_id` int(11) NOT NULL,
  `nome` varchar(255) NOT NULL,
  `caminho` varchar(500) NOT NULL,
  `data_upload` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Despejando dados para a tabela `documentos`
--

INSERT INTO `documentos` (`id`, `negocio_id`, `nome`, `caminho`, `data_upload`) VALUES
(1, 2, 'Diagrama de caso de uso - GestÃ£o de InventÃ¡rio.jpeg', '1776705170690-Diagrama de caso de uso - GestÃ£o de InventÃ¡rio.jpeg', '2026-04-20 17:12:50'),
(2, 3, 'Diagrama de Classes.jpeg', '1777980096163-Diagrama de Classes.jpeg', '2026-05-05 11:21:36');

-- --------------------------------------------------------

--
-- Estrutura para tabela `inventario`
--

CREATE TABLE `inventario` (
  `id` int(11) NOT NULL,
  `veiculo` varchar(100) NOT NULL,
  `stock` enum('disponivel','indisponivel') DEFAULT 'disponivel',
  `preco` decimal(10,2) DEFAULT NULL,
  `data_adicao` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Estrutura para tabela `negocios`
--

CREATE TABLE `negocios` (
  `id` int(11) NOT NULL,
  `codigo` varchar(20) NOT NULL,
  `cliente_id` int(11) NOT NULL,
  `veiculo` varchar(100) DEFAULT NULL,
  `estado` enum('submetido','documentos_solicitados','documentos_recebidos','proposta_criada','aguardando_decisao_direcao','renegociacao','proposta_enviada','proposta_aceite','pagamento_sinal','em_importacao','pagamento_final','concluido','cancelado') DEFAULT 'submetido',
  `data_criacao` timestamp NOT NULL DEFAULT current_timestamp(),
  `preco` decimal(10,2) DEFAULT NULL,
  `comentario` text DEFAULT NULL,
  `motivo_rejeicao` text DEFAULT NULL,
  `preco_sinal` decimal(10,2) DEFAULT NULL,
  `preco_final` decimal(10,2) DEFAULT NULL,
  `sinal_pago` tinyint(4) DEFAULT 0,
  `pagamento_final_pago` tinyint(4) DEFAULT 0,
  `documentos_validados` tinyint(4) DEFAULT 0,
  `motivo_renegociacao` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Despejando dados para a tabela `negocios`
--

INSERT INTO `negocios` (`id`, `codigo`, `cliente_id`, `veiculo`, `estado`, `data_criacao`, `preco`, `comentario`, `motivo_rejeicao`, `preco_sinal`, `preco_final`, `sinal_pago`, `pagamento_final_pago`, `documentos_validados`, `motivo_renegociacao`) VALUES
(1, 'EI-2858', 3, 'BMw m4 competicion', 'cancelado', '2026-04-20 16:43:32', 15000.00, 'fveawdw', '', NULL, NULL, 0, 0, 0, NULL),
(2, 'EI-6088', 3, 'd', 'concluido', '2026-04-20 16:57:06', 10000.00, 've esta oferta', NULL, 5000.00, NULL, 1, 0, 1, NULL),
(3, 'EI-3725', 3, 'bmw', 'cancelado', '2026-05-05 11:20:53', 1000.00, '', '', 500.00, NULL, 0, 0, 1, NULL);

-- --------------------------------------------------------

--
-- Estrutura para tabela `notificacoes`
--

CREATE TABLE `notificacoes` (
  `id` int(11) NOT NULL,
  `utilizador_id` int(11) NOT NULL,
  `mensagem` varchar(255) NOT NULL,
  `lida` tinyint(4) DEFAULT 0,
  `data_criacao` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Despejando dados para a tabela `notificacoes`
--

INSERT INTO `notificacoes` (`id`, `utilizador_id`, `mensagem`, `lida`, `data_criacao`) VALUES
(1, 3, 'Pedido EI-2858 recebido e em análise', 0, '2026-04-20 16:43:32'),
(2, 1, 'Novo pedido EI-2858 necessita validação', 0, '2026-04-20 16:43:32'),
(3, 3, 'O seu pedido EI-2858 foi atualizado para: aguardando resposta', 0, '2026-04-20 16:44:53'),
(4, 3, 'O seu pedido EI-2858 foi atualizado para: aguardando faturacao', 0, '2026-04-20 16:45:41'),
(5, 3, 'O seu pedido EI-2858 foi atualizado para: cancelado', 0, '2026-04-20 16:46:06'),
(6, 3, 'O seu pedido EI-6088 foi submetido com sucesso', 0, '2026-04-20 16:57:06'),
(7, 4, 'Novo pedido EI-6088 recebido — d', 0, '2026-04-20 16:57:06'),
(8, 1, 'Novo pedido EI-6088 recebido — d', 0, '2026-04-20 16:57:06'),
(9, 3, 'Documentos solicitados para o pedido EI-6088', 0, '2026-04-20 16:57:45'),
(10, 4, 'Documentos solicitados para o pedido EI-6088', 0, '2026-04-20 16:57:45'),
(11, 1, 'Documentos solicitados para o pedido EI-6088', 0, '2026-04-20 16:57:45'),
(12, 5, 'Documentos solicitados para o pedido EI-6088', 0, '2026-04-20 16:57:45'),
(13, 4, 'Documentos enviados para o negócio #2', 0, '2026-04-20 17:12:50'),
(14, 3, 'Proposta criada para o pedido EI-6088', 0, '2026-04-20 17:13:32'),
(15, 4, 'Proposta criada para o pedido EI-6088', 0, '2026-04-20 17:13:32'),
(16, 1, 'Proposta criada para o pedido EI-6088', 0, '2026-04-20 17:13:32'),
(17, 5, 'Proposta criada para o pedido EI-6088', 0, '2026-04-20 17:13:32'),
(18, 3, 'Pedido EI-6088 aguarda decisão da Direção', 0, '2026-04-20 17:15:01'),
(19, 4, 'Pedido EI-6088 aguarda decisão da Direção', 0, '2026-04-20 17:15:01'),
(20, 1, 'Pedido EI-6088 aguarda decisão da Direção', 0, '2026-04-20 17:15:01'),
(21, 5, 'Pedido EI-6088 aguarda decisão da Direção', 0, '2026-04-20 17:15:01'),
(22, 3, 'Proposta de valores enviada para o pedido EI-6088', 0, '2026-04-20 17:15:14'),
(23, 4, 'Proposta de valores enviada para o pedido EI-6088', 0, '2026-04-20 17:15:14'),
(24, 1, 'Proposta de valores enviada para o pedido EI-6088', 0, '2026-04-20 17:15:14'),
(25, 5, 'Proposta de valores enviada para o pedido EI-6088', 0, '2026-04-20 17:15:14'),
(26, 3, 'Proposta aceite para o pedido EI-6088', 0, '2026-04-20 17:15:38'),
(27, 4, 'Proposta aceite para o pedido EI-6088', 0, '2026-04-20 17:15:38'),
(28, 1, 'Proposta aceite para o pedido EI-6088', 0, '2026-04-20 17:15:38'),
(29, 5, 'Proposta aceite para o pedido EI-6088', 0, '2026-04-20 17:15:38'),
(30, 4, 'Sinal pago para negócio #2', 0, '2026-04-20 17:15:44'),
(31, 3, 'Importação iniciada para o pedido EI-6088', 0, '2026-04-20 17:16:10'),
(32, 4, 'Importação iniciada para o pedido EI-6088', 0, '2026-04-20 17:16:10'),
(33, 1, 'Importação iniciada para o pedido EI-6088', 0, '2026-04-20 17:16:10'),
(34, 5, 'Importação iniciada para o pedido EI-6088', 0, '2026-04-20 17:16:10'),
(35, 3, 'Pagamento final confirmado para EI-6088', 0, '2026-04-20 17:16:13'),
(36, 4, 'Pagamento final confirmado para EI-6088', 0, '2026-04-20 17:16:13'),
(37, 1, 'Pagamento final confirmado para EI-6088', 0, '2026-04-20 17:16:13'),
(38, 5, 'Pagamento final confirmado para EI-6088', 0, '2026-04-20 17:16:13'),
(39, 3, 'Processo EI-6088 concluído com sucesso!', 0, '2026-04-20 17:16:20'),
(40, 4, 'Processo EI-6088 concluído com sucesso!', 0, '2026-04-20 17:16:20'),
(41, 1, 'Processo EI-6088 concluído com sucesso!', 0, '2026-04-20 17:16:20'),
(42, 5, 'Processo EI-6088 concluído com sucesso!', 0, '2026-04-20 17:16:20'),
(43, 3, 'O seu pedido EI-3725 foi submetido com sucesso', 0, '2026-05-05 11:20:53'),
(44, 4, 'Novo pedido EI-3725 recebido — bmw', 0, '2026-05-05 11:20:53'),
(45, 1, 'Novo pedido EI-3725 recebido — bmw', 0, '2026-05-05 11:20:53'),
(46, 3, 'Documentos solicitados para o pedido EI-3725', 0, '2026-05-05 11:21:13'),
(47, 4, 'Documentos solicitados para o pedido EI-3725', 0, '2026-05-05 11:21:13'),
(48, 1, 'Documentos solicitados para o pedido EI-3725', 0, '2026-05-05 11:21:13'),
(49, 5, 'Documentos solicitados para o pedido EI-3725', 0, '2026-05-05 11:21:13'),
(50, 4, 'Documentos enviados para o negócio #3', 0, '2026-05-05 11:21:36'),
(51, 3, 'Proposta criada para o pedido EI-3725', 0, '2026-05-05 11:21:50'),
(52, 4, 'Proposta criada para o pedido EI-3725', 0, '2026-05-05 11:21:50'),
(53, 1, 'Proposta criada para o pedido EI-3725', 0, '2026-05-05 11:21:50'),
(54, 5, 'Proposta criada para o pedido EI-3725', 0, '2026-05-05 11:21:50'),
(55, 3, 'Pedido EI-3725 aguarda decisão da Direção', 0, '2026-05-05 11:22:26'),
(56, 4, 'Pedido EI-3725 aguarda decisão da Direção', 0, '2026-05-05 11:22:26'),
(57, 1, 'Pedido EI-3725 aguarda decisão da Direção', 0, '2026-05-05 11:22:26'),
(58, 5, 'Pedido EI-3725 aguarda decisão da Direção', 0, '2026-05-05 11:22:26'),
(59, 3, 'Pedido EI-3725 foi cancelado', 0, '2026-05-05 11:22:48'),
(60, 4, 'Pedido EI-3725 foi cancelado', 0, '2026-05-05 11:22:48'),
(61, 1, 'Pedido EI-3725 foi cancelado', 0, '2026-05-05 11:22:48'),
(62, 5, 'Pedido EI-3725 foi cancelado', 0, '2026-05-05 11:22:48');

-- --------------------------------------------------------

--
-- Estrutura para tabela `utilizadores`
--

CREATE TABLE `utilizadores` (
  `id` int(11) NOT NULL,
  `nome` varchar(100) DEFAULT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `data_registo` timestamp NOT NULL DEFAULT current_timestamp(),
  `tipo` enum('cliente','funcionario','administrador','direcao') NOT NULL DEFAULT 'cliente'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Despejando dados para a tabela `utilizadores`
--

INSERT INTO `utilizadores` (`id`, `nome`, `email`, `password`, `data_registo`, `tipo`) VALUES
(1, 'Administrador', 'teste@gmail.com', '$2b$10$Fj5nuYHtkYoBZYUnCn6XruMjrqET3xMHTOkQZD.uqlIj95Evcl1ui', '2026-04-01 15:28:30', 'administrador'),
(3, 'João Cliente', 'cliente@teste.com', '$2b$10$Fj5nuYHtkYoBZYUnCn6XruMjrqET3xMHTOkQZD.uqlIj95Evcl1ui', '2026-04-20 16:42:07', 'cliente'),
(4, 'Catarina Funcionaria', 'funcionario@teste.com', '$2b$10$Fj5nuYHtkYoBZYUnCn6XruMjrqET3xMHTOkQZD.uqlIj95Evcl1ui', '2026-04-20 16:42:07', 'funcionario'),
(5, 'Pedro Direcao', 'direcao@teste.com', '$2b$10$Fj5nuYHtkYoBZYUnCn6XruMjrqET3xMHTOkQZD.uqlIj95Evcl1ui', '2026-04-20 16:42:07', 'direcao');

--
-- Índices para tabelas despejadas
--

--
-- Índices de tabela `documentos`
--
ALTER TABLE `documentos`
  ADD PRIMARY KEY (`id`),
  ADD KEY `negocio_id` (`negocio_id`);

--
-- Índices de tabela `inventario`
--
ALTER TABLE `inventario`
  ADD PRIMARY KEY (`id`);

--
-- Índices de tabela `negocios`
--
ALTER TABLE `negocios`
  ADD PRIMARY KEY (`id`),
  ADD KEY `cliente_id` (`cliente_id`);

--
-- Índices de tabela `notificacoes`
--
ALTER TABLE `notificacoes`
  ADD PRIMARY KEY (`id`),
  ADD KEY `utilizador_id` (`utilizador_id`);

--
-- Índices de tabela `utilizadores`
--
ALTER TABLE `utilizadores`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- AUTO_INCREMENT para tabelas despejadas
--

--
-- AUTO_INCREMENT de tabela `documentos`
--
ALTER TABLE `documentos`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT de tabela `inventario`
--
ALTER TABLE `inventario`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de tabela `negocios`
--
ALTER TABLE `negocios`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT de tabela `notificacoes`
--
ALTER TABLE `notificacoes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=63;

--
-- AUTO_INCREMENT de tabela `utilizadores`
--
ALTER TABLE `utilizadores`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- Restrições para tabelas despejadas
--

--
-- Restrições para tabelas `documentos`
--
ALTER TABLE `documentos`
  ADD CONSTRAINT `documentos_ibfk_1` FOREIGN KEY (`negocio_id`) REFERENCES `negocios` (`id`);

--
-- Restrições para tabelas `negocios`
--
ALTER TABLE `negocios`
  ADD CONSTRAINT `negocios_ibfk_1` FOREIGN KEY (`cliente_id`) REFERENCES `utilizadores` (`id`);

--
-- Restrições para tabelas `notificacoes`
--
ALTER TABLE `notificacoes`
  ADD CONSTRAINT `notificacoes_ibfk_1` FOREIGN KEY (`utilizador_id`) REFERENCES `utilizadores` (`id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
