const PubNub = require('pubnub');

const credentials = {
    publishKey: 'pub-c-721f708b-6583-4747-86bf-a699c8dc3a00',
    subscribeKey: 'sub-c-8b4298e5-329d-42f0-9a2e-da6615ad699d',
    secretKey: 'sec-c-NDFhMWVmN2EtYjUzYi00NzJlLWEyN2YtYjgxZTY1Y2E0YzBh',
    uuid: 'achyut'
};

const CHANNELS = {
    TEST: 'TEST'
};

class PubSub {
    constructor() {
        this.pubnub = new PubNub(credentials);
        this.subscribeToChannels();
        this.pubnub.addListener(this.listener());
    }

    listener() {
        return {
            message: messageObject => {
                const { channel, message } = messageObject;
            }
        };
    }

    subscribeToChannels() {
        this.pubnub.subscribe({
            channels: Object.values(CHANNELS)
        });
    }

    publish(channel, message) {
        this.pubnub.publish({ channel, message });
    }
}

const testPubSub = new PubSub();
testPubSub.publish({ channel: CHANNELS.TEST, message: 'hello world' });

module.exports = PubSub;