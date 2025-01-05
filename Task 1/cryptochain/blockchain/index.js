const Block = require('./block');
const Transaction = require('../wallet/transaction');
const Wallet = require('../wallet');
const { cryptoHash } = require('../utils');
const { REWARD_INPUT, MINING_REWARD } = require('../config');

class Blockchain {
    constructor() {
        this.chain = [Block.genesis()];
    }

    addBlock({ data }) {
        const startTime = process.hrtime();

        const newBlock = Block.mineBlock({
            lastBlock: this.chain[this.chain.length - 1],
            data
        });
        this.chain.push(newBlock);

        const endTime = process.hrtime(startTime);

        const timeTakenNs = endTime[0] * 1e9 + endTime[1];
        console.log(`\nTime taken to add block: ${timeTakenNs} nanoseconds.`);

        const cpuClockSpeedGHz = 3.2;
        const timeTakenInCpuClocks = timeTakenNs * cpuClockSpeedGHz;
        console.log(`Approximate CPU clocks taken to add block: ${timeTakenInCpuClocks.toFixed(2)} clocks.\n`);
    }

    replaceChain(chain, validateTransactions, onSuccess) {
        if(chain.length <= this.chain.length) {
            console.error('The incoming chain must be longer');
            return;
        }

        if(!Blockchain.isValidChain(chain)) {
            console.error('The incoming chain must be valid');
            return;
        }

        if(validateTransactions && !this.validTransactionData({ chain })) {
            console.error('The incoming chain has invalid data');
            return;
        }

        if(onSuccess) onSuccess();
        
        console.log('Replacing blockchain with the new chain: ', chain);
        this.chain = chain;
    }

    validTransactionData({ chain }) {
        for(let i = 1; i < chain.length; i++) {
            const block = chain[i];
            const transactionSet = new Set();
            let rewardTransactionCount = 0;

            for(let transaction of block.data) {
                if(transaction.input.address === REWARD_INPUT.address) {
                    rewardTransactionCount++;

                    if(rewardTransactionCount > 1) {
                        console.error('Miner rewards exceed limit');
                        return false;
                    }

                    if(Object.values(transaction.outputMap)[0] !== MINING_REWARD) {
                        console.error('Miner reward amount is invalid');
                        return false;
                    }
                } 
                else {
                    if(!Transaction.validTransaction(transaction)) {
                        console.error('Invalid transaction');
                        return false;
                    }

                    const trueBalance = Wallet.calculateBalance({
                        chain: this.chain.slice(0,i),
                        address: transaction.input.address
                    });

                    if(transaction.input.amount !== trueBalance) {
                        console.error('Invalid input amount');
                        return false;
                    }

                    if(transactionSet.has(transaction)) {
                        console.error('Identical transactions appear more than once in the block');
                        return false;
                    }
                    else {
                        transactionSet.add(transaction);
                    }
                }
            }
        }
        return true;
    }

    static isValidChain(chain){
        const startTime = process.hrtime();

        if(JSON.stringify(chain[0]) !== JSON.stringify(Block.genesis())) {
            return false;
        }

        for(let i = 1; i < chain.length; i++) {
            const { index, timestamp, lastHash, hash, nonce, difficulty, data } = chain[i];
            const actualLastHash = chain[i - 1].hash;
            const lastDifficulty = chain[i - 1].difficulty;

            if(lastHash !== actualLastHash) {
                return false;
            }

            const validatedHash = cryptoHash( index, timestamp, lastHash, data, nonce, difficulty);

            if(hash !== validatedHash) {
                return false;
            }

            if(Math.abs(lastDifficulty - difficulty) > 1) {
                return false;
            }
        }

        const endTime = process.hrtime(startTime);

        const timeTakenNs = endTime[0] * 1e9 + endTime[1];
        console.log(`\nTime taken to validate chain: ${timeTakenNs} nanoseconds.`);

        const cpuClockSpeedGHz = 3.2;
        const timeTakenInCpuClocks = timeTakenNs * cpuClockSpeedGHz;
        console.log(`Approximate CPU clocks taken to validate chain: ${timeTakenInCpuClocks.toFixed(2)} clocks.\n`);

        return true;
    }
}

module.exports = Blockchain;