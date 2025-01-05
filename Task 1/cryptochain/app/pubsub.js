const redis = require('redis');

const REDIS_PORT = 6379;
const REDIS_HOST = "127.0.0.1";

const CHANNELS = {
    TEST: 'TEST',
    BLOCKCHAIN: 'BLOCKCHAIN',
    TRANSACTION: 'TRANSACTION'
};

class PubSub {
    constructor({ blockchain, transactionPool }) {
        this.blockchain = blockchain;
        this.transactionPool = transactionPool;

        this.publisher = redis.createClient({
            host: REDIS_HOST,
            port: REDIS_PORT
        });
        this.subscriber = redis.createClient({
            host: REDIS_HOST,
            port: REDIS_PORT
        });

        this.subscribeToChannels();
        this.subscriber.on('message', (channel, message) => {
            this.handleMessage(channel, message);
        });
    }

    handleMessage(channel, message) {
        const parsedMessage = JSON.parse(message);

        let endTime = process.hrtime(parsedMessage.startTime);    
        let latencyNs = endTime[0] * 1e9 + endTime[1];

        switch(channel) {
            case CHANNELS.BLOCKCHAIN:
                console.log(`\nNetwork latency for Redis broadcast (BLOCKCHAIN channel): ${latencyNs} nanoseconds.\n`);

                this.blockchain.replaceChain(parsedMessage.chain, true, () => {
                    this.transactionPool.clearBlockchainTransactions({ chain: parsedMessage.chain });
                });
                break;
            case CHANNELS.TRANSACTION:
                console.log(`\nNetwork latency for Redis broadcast (TRANSACTION channel): ${latencyNs} nanoseconds.\n`);

                this.transactionPool.setTransaction(parsedMessage.transaction);
                break;
            default:
                return;
        }
    }

    subscribeToChannels() {
        Object.values(CHANNELS).forEach(channel => {
            this.subscriber.subscribe(channel);
        });
    }

    publish({ channel, message }) {
        this.subscriber.unsubscribe(channel, () => {
            this.publisher.publish(channel, message, () => {
                this.subscriber.subscribe(channel);
            });
        });
    }

    broadcastChain() {
        const startTime = process.hrtime();

        this.publish({
            channel: CHANNELS.BLOCKCHAIN,
            message: JSON.stringify({ chain: this.blockchain.chain, startTime })
        });
    }

    broadcastTransaction(transaction) {
        const startTime = process.hrtime();

        this.publish({
            channel: CHANNELS.TRANSACTION,
            message: JSON.stringify({ transaction, startTime })
        });
    }
}


module.exports = PubSub;