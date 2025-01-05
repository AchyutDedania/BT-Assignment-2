
import time
import hashlib
from typing import Dict
class Blockchain:
    def __init__(self):
        self.chain=[]
        self.mempool=[]

    def mine_pending_transactions(self)->Dict[str,float]:
           '''
           Mine pending transactions and add them to the blockchain.
           '''
           if not self.mempool:
                 print("No transactions to mine!")
                 return {
                "normal_time":0,
                "pinned_time":0
           } 
           block = {"transactions": [], "nonce": 0}
           
           total_normal_time=0
           total_pinned_time=0
           self.mempool.sort(key=lambda tx: tx.fee, reverse=True)
           
           for tx in self.mempool:
                start_time=time.time()
                if tx.is_pinned:
                   print(f"Solving puzzle for pinned transaction: {tx.sender} -> {tx.recipient}")
                   tx.solve_puzzle()
                   end_time = time.time()
                   total_pinned_time += (end_time - start_time)  # Track time for pinned transactions
                else:
                    end_time = time.time()
                    total_normal_time += (end_time - start_time) 
                block["transactions"].append(tx)

           while not self.is_valid_proof(block):
                block["nonce"]+=1
           self.chain.append(block)
           self.mempool=[]
           print(f"Blockchain mined successfully!!")
           return {
                "normal_time":total_normal_time,
                "pinned_time":total_pinned_time
           } 

             
    
    

    def is_valid_proof(self, block: dict) -> bool:
        """
        Validate the Proof of Work for a block.
        The proof is valid if the hash of the block starts with a specified number of zeros.
        """
        block_string = f"{block['transactions']}{block['nonce']}".encode()
        block_hash = hashlib.sha256(block_string).hexdigest()
        difficulty = 4  # Number of leading zeros required
        return block_hash[:difficulty] == "0" * difficulty

    def add_transaction(self, transaction):
        """Add a transaction to the pending transactions (mempool)."""
        self.mempool.append(transaction)