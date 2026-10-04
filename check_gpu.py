import sys

def check_gpu():
    print("Checking system requirements for Knowledge Discovery Pipeline...")
    print(f"Python Version: {sys.version.split(' ')[0]}\n")

    try:
        import torch
        print(f"PyTorch Version: {torch.__version__}")
        
        if torch.cuda.is_available():
            print("\nSUCCESS: GPU (CUDA) is available!")
            print(f"GPU Name: {torch.cuda.get_device_name(0)}")
            print(f"CUDA Capability: {torch.cuda.get_device_capability(0)}")
        else:
            print("\nWARNING: GPU (CUDA) is NOT available.")
            print("PyTorch is running on CPU. Whisper and CLIP inference will be significantly slower.")
    except ImportError:
        print("\nERROR: PyTorch is not installed in this environment.")
        print("Please activate your virtual environment and run 'pip install -r requirements.txt'.")

if __name__ == "__main__":
    check_gpu()
