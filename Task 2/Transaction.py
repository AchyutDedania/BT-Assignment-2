import hashlib
import time
import random
class Transaction:
    def __init__(self, sender, recipient, amount, fee, is_pinned=False, puzzle=None):
        self.sender = sender
        self.recipient = recipient
        self.amount = amount
        self.fee = fee
        self.is_pinned = is_pinned
        self.puzzle = puzzle  
    

    def solve_puzzle(self):
        """Simulate solving a computational puzzle (only for pinned transactions)."""
        if not self.is_pinned:
            return True  
        
        # Start time to measure puzzle-solving delay
        start_time = time.time()
        complexity = len(self.puzzle)  # Longer puzzles take more time
        delay = random.uniform(0.5, 1.5) * complexity  # random number indicate each Node has differnet computation power
        time.sleep(delay)  # Simulate the delay for solving the puzzle
       
        nonce = 0
        while True:
            attempt = f"{self.puzzle}{nonce}".encode()
            hashed = hashlib.sha256(attempt).hexdigest()
            if hashed[:4] == "0000":  
                break
            nonce += 1

        
        end_time = time.time()

        
        print(f"Puzzle solved for {self.sender} -> {self.recipient}: Time taken = {end_time - start_time:.4f} seconds")
        return True
