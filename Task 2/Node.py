import time
import hashlib
import requests
from Transaction import Transaction
from threading import Thread

class Node:
    def __init__(self,port,blockchain):
        self.port=port
        self.blockchain=blockchain


    def add_transaction(self,transaction_data):
        sender=transaction_data["sender"]
        recipient=transaction_data['recipient']
        amount = transaction_data["amount"]
        fee = transaction_data["fee"]
        is_pinned = transaction_data["is_pinned"]
        puzzle = transaction_data.get("puzzle", None)

        transaction = Transaction(sender, recipient, amount, fee, is_pinned, puzzle)
        self.blockchain.add_transaction(transaction)
    
    def mine_block(self):
        """Mine a block with pending transactions."""
        start_time = time.time()
        response=self.blockchain.mine_pending_transactions()
        end_time = time.time()
        return response
    

    def run_node(self):
        """Start the node to listen for incoming requests."""
        from flask import Flask, request

        app = Flask(__name__)

        @app.route('/add_transaction', methods=['POST'])
        def add_transaction():
            transaction_data = request.json
            self.add_transaction(transaction_data)
            return {"status": "Transaction added to mempool."}, 200

        @app.route('/mine', methods=['POST'])
        def mine():
            response=self.mine_block()
            return {"status": "Mining started.", 
                    "time":response}, 200

        app.run(host="0.0.0.0", port=self.port)

    def start(self):
        """Start the node in a separate thread."""
        node_thread = Thread(target=self.run_node)
        node_thread.start()