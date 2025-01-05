// Core Classes
class Block {
    constructor(index, timestamp, transactions, previousBlockHash = '', nonce = 0) {
        this.index = index;
        this.timestamp = timestamp;
        this.transactions = transactions;
        this.previousBlockHash = previousBlockHash;
        this.nonce = nonce;
        this.blockHash = this.calculateHash();
        this.miner = index === 0 ? null : { //this is the miner info displayed
            address: 'MINER',
            timeSpent: 0,
            difficulty: 0,
            profitability: 0
        };
        this.totalFees = 0;
    }

    calculateHash() { //calculation of the hash values
        return CryptoJS.SHA256(this.index + this.previousBlockHash + this.timestamp + JSON.stringify(this.transactions) + this.nonce).toString();
    }
}

class Transaction {
    constructor(sender, recipient, amount, fee) {
        this.sender = sender;
        this.recipient = recipient;
        this.amount = amount;
        this.fee = fee;
        this.timestamp = Date.now();
        this.isPinning = false;
    }
}

// P2P Connection Manager
class P2PConnectionManager {
    constructor(blockchain) {
        this.blockchain = blockchain;
        this.peers = new Map();  // Map of connected peers
        this.peerId = this.generatePeerId();
        this.connectionAttempts = new Map();    // Connection attempts map
        this.initializePeerJS();
        this.setupNetworkStatusDisplay();
    }

    generatePeerId() {
        return 'peer_' + Math.random().toString(36).substr(2, 9);
    }

    initializePeerJS() {
        this.peer = new Peer(this.peerId);

        this.peer.on('open', (id) => {  // Event listener for when peer is connected
            console.log('My peer ID is: ' + id);
            document.getElementById('peerIdDisplay').textContent = `Your Peer ID: ${id}`;
            this.updateNetworkStatus(true, 'Ready to Connect');
        });

        this.peer.on('connection', (conn) => {  // Event listener for incoming connections
            this.handleIncomingConnection(conn);
        });

        this.peer.on('error', (err) => { // Event listener for errors
            console.error('Peer error:', err);
            this.updateNetworkStatus(false, `Error: ${err.message}`);
        });

        this.peer.on('disconnected', () => { // Event listener for disconnection
            console.log('Disconnected from server');
            this.updateNetworkStatus(false, 'Disconnected from server');
            this.reconnectPeer();
        });
    }

    async reconnectPeer() {  // Reconnects the peer
        if (this.peer.disconnected) {
            this.peer.reconnect();
            console.log('PeerJS reconnected.');
        }
    }

    updateNetworkStatus(connected, message = '') {  // Updates the network status
        const indicator = document.getElementById('networkIndicator');
        const status = document.getElementById('networkStatus');

        indicator.className = 'status-indicator ' +
            (connected ? 'status-connected' : 'status-disconnected');
        status.textContent = message || (connected ? 'Connected' : 'Disconnected');
    }

    setupNetworkStatusDisplay() { // Sets up the network status display
        const indicator = document.getElementById('networkIndicator');
        const status = document.getElementById('networkStatus');

        this.updateNetworkStatus = (connected) => {
            indicator.className = 'status-indicator ' +
                (connected ? 'status-connected' : 'status-disconnected');
            status.textContent = connected ? 'Connected' : 'Disconnected';
        };
    }

    async connectToPeer(remotePeerId) {
        if (remotePeerId === this.peerId) {
            alert('Cannot connect to yourself');
            return;
        }

        if (this.peers.has(remotePeerId)) {
            console.log('Already connected to this peer');
            return;
        }

        const conn = this.peer.connect(remotePeerId, {
            reliable: true // Ensure messages are reliably delivered
        });

        conn.on('open', () => {
            console.log(`Successfully connected to peer: ${remotePeerId}`);
            this.setupPeerConnection(conn);
        });

        conn.on('error', (err) => {
            console.error(`Error connecting to peer ${remotePeerId}:`, err);
            alert(`Failed to connect to peer: ${err.message}`);
        });

        conn.on('close', () => {
            console.warn(`Connection to peer ${remotePeerId} closed.`);
            this.peers.delete(remotePeerId);
            this.updateConnectedPeersDisplay();
        });
    }

    handleIncomingConnection(conn) {
        conn.on('open', () => {
            console.log(`Incoming connection from: ${conn.peer}`);
            this.setupPeerConnection(conn);
        });

        conn.on('error', (err) => {
            console.error(`Error on connection with ${conn.peer}:`, err);
        });
    }

    setupPeerConnection(conn) {
        conn.on('open', () => {
            this.peers.set(conn.peer, conn);
            this.updateConnectedPeersDisplay();

            conn.send({
                type: 'REQUEST_CHAIN',
                peerId: this.peerId
            });
        });

        conn.on('data', (data) => {
            this.handlePeerMessage(data, conn.peer);
        });

        conn.on('close', () => {
            this.peers.delete(conn.peer);
            this.updateConnectedPeersDisplay();
        });
    }

    handlePeerMessage(message, senderId) {
        switch (message.type) {
            case 'NEW_BLOCK':
                this.handleNewBlock(message.data, senderId);
                break;
            case 'NEW_TRANSACTION':
                this.handleNewTransaction(message.data, senderId);
                break;
            case 'REQUEST_CHAIN':
                this.sendEntireChain(senderId);
                break;
            case 'CHAIN_UPDATE':
                this.handleChainUpdate(message.data, senderId);
                break;
        }
    }

    broadcast(message, excludePeerId = null) {
        this.peers.forEach((conn, peerId) => {
            if (peerId !== excludePeerId && conn.open) {
                conn.send(message);
            }
        });
    }

    handleNewBlock(block, senderId) {
        if (this.validateBlock(block)) {
            if (!this.blockchain.chain.some(b => b.blockHash === block.blockHash)) {
                this.blockchain.chain.push(block);
                this.blockchain.updateWalletsUI();
                this.blockchain.displayBlockchain();

                this.broadcast({
                    type: 'NEW_BLOCK',
                    data: block
                }, senderId);
            }
        }
    }

    handleNewTransaction(transaction, senderId) {
        if (this.validateTransaction(transaction)) {
            if (!this.blockchain.pendingTransactions.some(t =>
                t.sender === transaction.sender &&
                t.timestamp === transaction.timestamp)) {
                this.blockchain.pendingTransactions.push(transaction);
                this.blockchain.displayPendingTransactions();

                this.broadcast({
                    type: 'NEW_TRANSACTION',
                    data: transaction
                }, senderId);
            }
        }
    }

    sendEntireChain(receiverId) {
        const peer = this.peers.get(receiverId);
        if (peer && peer.open) {
            peer.send({
                type: 'CHAIN_UPDATE',
                data: {
                    chain: this.blockchain.chain,
                    pendingTransactions: this.blockchain.pendingTransactions,
                    users: this.blockchain.users
                }
            });
        }
    }

    handleChainUpdate(data, senderId) {
        if (this.validateChainUpdate(data.chain)) {
            this.blockchain.chain = data.chain;
            this.blockchain.pendingTransactions = data.pendingTransactions;
            this.blockchain.users = data.users;

            this.blockchain.updateWalletsUI();
            this.blockchain.displayBlockchain();
            this.blockchain.displayPendingTransactions();
        }
    }

    validateBlock(block) {
        return true; // Simplified for demo
    }

    validateTransaction(transaction) {
        const totalCost = transaction.amount + transaction.fee;
        return this.blockchain.users[transaction.sender] >= totalCost;
    }

    validateChainUpdate(chain) {
        return true; // Simplified for demo
    }
}


// Main Blockchain Class
class Blockchain {
    constructor() {
        this.chain = [this.createGenesisBlock()];
        this.difficulty = 4;
        this.pendingTransactions = [];
        this.minedBlocks = [];
        this.users = {
            'A': 1000,
            'B': 1000,
            'C': 1000,
            'MINER': 0
        };
        this.pinningAttackActive = false;

        // Initialize P2P connection manager
        this.p2pManager = new P2PConnectionManager(this);

        this.updateWalletsUI();
        this.displayBlockchain();
        this.displayPendingTransactions();
    }

    createGenesisBlock() {
        return new Block(0, Date.now(), [], null, 0);
    }

    getLatestBlock() {
        return this.chain[this.chain.length - 1];
    }

    createTransaction(transaction) {
        const totalCost = transaction.amount + transaction.fee;
        if (this.users[transaction.sender] < totalCost) {
            alert('Transaction failed: Insufficient balance (including fees)');
            return false;
        }

        if (this.pinningAttackActive && transaction.fee >= 8) {
            transaction.isPinning = true;
        }

        this.pendingTransactions.push(transaction);

        // Broadcast to network
        this.p2pManager.broadcast({
            type: 'NEW_TRANSACTION',
            data: transaction
        });

        this.displayPendingTransactions();
        alert(`Transaction added with fee: ${transaction.fee} Finney`);
        return true;
    }

    sortTransactionsByFee(transactions) {
        return transactions.sort((a, b) => b.fee - a.fee);
    }

    togglePinningAttack() {
        this.pinningAttackActive = !this.pinningAttackActive;
        alert(`Pinning attack ${this.pinningAttackActive ? 'activated' : 'deactivated'}`);
        if (this.pinningAttackActive) {
            for (let i = 0; i < 5; i++) {
                const pinningTx = new Transaction('A', 'B', 1, 8);
                pinningTx.isPinning = true;
                this.createTransaction(pinningTx);
            }
        }
    }

    mineSelectedTransactions() {
        if (this.pendingTransactions.length === 0) {
            alert('No transactions to mine.');
            return;
        }

        const sortedTransactions = this.sortTransactionsByFee(this.pendingTransactions);
        const validTransactions = sortedTransactions.filter(transaction =>
            this.users[transaction.sender] >= (transaction.amount + transaction.fee)
        );

        if (validTransactions.length === 0) {
            alert('No valid transactions to mine.');
            return;
        }

        const selectedTransactions = validTransactions.slice(0, 3);
        const block = new Block(
            this.chain.length,
            Date.now(),
            selectedTransactions,
            this.getLatestBlock().blockHash
        );

        block.totalFees = selectedTransactions.reduce((sum, tx) => sum + tx.fee, 0);
        block.miner = 'MINER';

        this.mineBlock(block);
        this.minedBlocks.push(block);

        this.pendingTransactions = this.pendingTransactions.filter(
            tx => !selectedTransactions.includes(tx)
        );

        this.displayMinedBlocks();
        this.displayPendingTransactions();
        alert(`Block mined successfully! Total fees: ${block.totalFees} Coins`);
    }

    mineBlock(block) {
        const startTime = Date.now();
        let attempts = 0;

        while (!block.blockHash.startsWith('000')) {
            block.nonce++;
            block.blockHash = block.calculateHash();
            attempts++;

            if (Date.now() - startTime > 1000) break;
        }

        block.miner = {
            address: 'MINER',
            timeSpent: Date.now() - startTime,
            difficulty: attempts,
            profitability: block.totalFees / attempts
        };
    }

    broadcastSelectedBlocks() {
        const checkboxes = document.querySelectorAll('.mined-block-checkbox:checked');
        const selectedBlockIndexes = Array.from(checkboxes).map(cb => parseInt(cb.value));

        selectedBlockIndexes.forEach(index => {
            const block = this.minedBlocks[index];
            this.chain.push(block);

            // Broadcast to network
            this.p2pManager.broadcast({
                type: 'NEW_BLOCK',
                data: block
            });

            block.transactions.forEach(transaction => {
                this.users[transaction.sender] -= (transaction.amount + transaction.fee);
                this.users[transaction.recipient] += transaction.amount;
                this.users['MINER'] += transaction.fee;
            });
        });

        this.minedBlocks = this.minedBlocks.filter((_, index) => !selectedBlockIndexes.includes(index));

        this.updateWalletsUI();
        this.displayBlockchain();
        this.displayMinedBlocks();
        alert('Blocks broadcasted to network!');
    }

    // UI Update Methods
    updateWalletsUI() {
        document.getElementById('walletA').innerText = this.users.A;
        document.getElementById('walletB').innerText = this.users.B;
        document.getElementById('walletC').innerText = this.users.C;
        document.getElementById('walletMiner').innerText = this.users.MINER;
    }

    displayBlockchain() {
        const blockchainDiv = document.getElementById('blockchain');
        blockchainDiv.innerHTML = '';
        this.chain.forEach(block => {
            const blockElement = document.createElement('div');
            blockElement.classList.add('block');

            const minerInfo = block.miner === null ? 'Genesis Block' : `
                <div class="info-label">Address:</div> <div class="info-value">${block.miner.address}</div>
                <div class="info-label">Mining Time:</div> <div class="info-value">${block.miner.timeSpent}ms</div>
                <div class="info-label">Attempts:</div> <div class="info-value">${block.miner.difficulty}</div>
                <div class="info-label">Profitability:</div> <div class="info-value">${block.miner.profitability.toFixed(4)} fees/attempt</div>
            `;

            blockElement.innerHTML = `
                <strong>Block ${block.index}</strong>
                <div class="block-info">Timestamp: ${new Date(block.timestamp)}</div>
                <div class="block-info">Transactions: ${JSON.stringify(block.transactions)}</div>
                <div class="block-info">Total Fees: ${block.totalFees} Finney</div>
                <div class="miner-info">
                    <div class="miner-info-label">Miner Info:</div>
                    <div class="miner-info-content">${minerInfo}</div>
                </div>
                <div class="block-info">Previous Hash: ${block.previousBlockHash ? block.previousBlockHash.substring(0, 10) : 'None'}</div>
                <div class="block-info">Hash: ${block.blockHash.substring(0, 10)}</div>
                <div class="block-info">Nonce: ${block.nonce}</div>
            `;
            blockchainDiv.appendChild(blockElement);
        });
    }

    displayPendingTransactions() {
        const pendingTransactionsDiv = document.getElementById('pendingTransactions');
        pendingTransactionsDiv.innerHTML = '';
        if (this.pendingTransactions.length === 0) {
            pendingTransactionsDiv.innerHTML = '<p>No pending transactions.</p>';
            return;
        }

        const sortedTransactions = this.sortTransactionsByFee([...this.pendingTransactions]);
        sortedTransactions.forEach(transaction => {
            const transactionElement = document.createElement('div');
            transactionElement.classList.add('pending-transaction');
            if (transaction.isPinning) {
                transactionElement.classList.add('pinning-transaction');
            }
            transactionElement.innerHTML = `
                <strong>Pending Transaction ${transaction.isPinning ? '(Pinning)' : ''}</strong><br>
                From: ${transaction.sender}<br>
                To: ${transaction.recipient}<br>
                Amount: ${transaction.amount} BTC<br>
                Fee: ${transaction.fee} Finney<br>
                Timestamp: ${new Date(transaction.timestamp)}
            `;
            pendingTransactionsDiv.appendChild(transactionElement);
        });
    }

    displayMinedBlocks() {
        const minedBlocksDiv = document.getElementById('minedBlocks');
        minedBlocksDiv.innerHTML = '';
        if (this.minedBlocks.length === 0) {
            minedBlocksDiv.innerHTML = '<p>No mined blocks waiting for broadcast.</p>';
            return;
        }
        this.minedBlocks.forEach((block, index) => {
            const blockElement = document.createElement('div');
            blockElement.classList.add('mined-block');
            blockElement.innerHTML = `
                <input type="checkbox" class="mined-block-checkbox" value="${index}">
                <strong>Mined Block ${block.index}</strong><br>
                Timestamp: ${new Date(block.timestamp)}<br>
                Transactions: ${JSON.stringify(block.transactions)}<br>
                Total Fees: ${block.totalFees} BTC<br>
                Hash: ${block.blockHash.substring(0, 10)}<br>
                Nonce: ${block.nonce}
            `;
            minedBlocksDiv.appendChild(blockElement);
        });
    }
}

const blockchain = new Blockchain();

function connectToPeer() {
    const remotePeerId = document.getElementById('peerIdInput').value.trim();
    blockchain.p2pManager.connectToPeer(remotePeerId);
}

function createTransaction() {
    const sender = document.getElementById('sender').value.toUpperCase();
    const recipient = document.getElementById('recipient').value.toUpperCase();
    const amount = parseFloat(document.getElementById('amount').value);
    const fee = parseFloat(document.getElementById('fee').value || '1'); // Default fee of 1

    if (!['A', 'B', 'C'].includes(sender) || !['A', 'B', 'C'].includes(recipient)) {
        alert('Invalid sender or recipient. Use A, B, or C.');
        return;
    }

    if (isNaN(amount) || amount <= 0 || isNaN(fee) || fee < 0) {
        alert('Please enter valid amount and fee values.');
        return;
    }

    const transaction = new Transaction(sender, recipient, amount, fee);
    blockchain.createTransaction(transaction);
}

function mineSelectedTransactions() {
    blockchain.mineSelectedTransactions();
}

function broadcastSelectedBlocks() {
    blockchain.broadcastSelectedBlocks();
}

function togglePinningAttack() {
    blockchain.togglePinningAttack();
}