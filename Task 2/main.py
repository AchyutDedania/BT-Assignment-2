from Blockchain import Blockchain
from Node import Node
import requests
import time
import matplotlib.pyplot as plt

def broadcast_transaction(nodes,tx):
    for node in nodes:
        try:
            response=requests.post(f'http://127.0.0.1:{port}/add_transaction', json=tx)
        except requests.exceptions.RequestException as e:
            print(f"failed , error={e}")
    print("Done with broadcasting transactions")

def analyse_performance(node_ports):
    total_normal_time = 0
    total_pinned_time = 0
    overall_start_time = time.time()

    # Simulate mining on all nodes
    for port in node_ports:
        print(f"Requesting mining from Node {port}...")
        response = requests.post(f'http://127.0.0.1:{port}/mine')
        
        data = response.json()
        data2=data['time']
        total_normal_time += data2["normal_time"]
        total_pinned_time += data2["pinned_time"]
        
    overall_end_time = time.time()

    # Print performance results
    print(f"Total time to mine blocks across all nodes: {overall_end_time - overall_start_time:.4f} seconds")
    print(f"Total time for normal transactions across all nodes: {total_normal_time:.4f} seconds")
    print(f"Total time for pinned transactions across all nodes: {total_pinned_time:.4f} seconds")
    return overall_end_time-overall_start_time




def visualize(normal_time, pinned_time):
    
    plt.figure(figsize=(10, 6))
    
    # Title and labels
    plt.title("Comparing Pinned Transactions and Normal Transactions Block Delay")
    plt.xlabel("Transaction Type")
    plt.ylabel("Time (Seconds)")

    
    transaction_types = ['Normal Transactions', 'Pinned Transactions']
    times = [normal_time, pinned_time]
    
    plt.bar(transaction_types, times, color=['blue', 'red'])
    
   
    plt.show()


if __name__=="__main__":
    blockchain=Blockchain()
    # node_ports to simulate
    node_ports=[5000,5001,5002]

    nodes=[]

    for port in node_ports:
        node=Node(port,blockchain)
        nodes.append(node)
        node.start()

    print("Execution for block or set of transaction having pinned transactions")
    normal_tx = {
        "sender": "Alice", "recipient": "Bob", "amount": 10, "fee": 1, "is_pinned": False
    }
    pinned_tx = {
        "sender": "Attacker", "recipient": "Eve", "amount": 50, "fee": 100, "is_pinned": True, "puzzle": "puzzle1"
    }

      # Broadcasting transactions to the nodes
    broadcast_transaction(node_ports, normal_tx)
    broadcast_transaction(node_ports, pinned_tx)

    # Simulate performance analysis
    pinned_time=analyse_performance(node_ports)
    print("Execution for block or set of transactions with only normal transactions")
    normal_tx = {
        "sender": "Alice", "recipient": "Bob", "amount": 10, "fee": 1, "is_pinned": False
    }
    normal_tx2 = {
        "sender": "Bob", "recipient": "Sham", "amount": 50, "fee": 10, "is_pinned": False
    }
     # Broadcasting transactions to the nodes
    broadcast_transaction(node_ports, normal_tx)
    broadcast_transaction(node_ports, normal_tx2)

    # Simulate performance analysis
    normal_time=analyse_performance(node_ports)
    visualize(normal_time,pinned_time)
