import os
import time
import threading
from datetime import datetime
from typing import Dict, List, Optional
import sqlite3
from pathlib import Path

class MultiUserHandler:
    """Handle multiple users uploading files simultaneously"""
    
    def __init__(self):
        self.upload_queue = []
        self.processing_queue = []
        self.user_workspaces = {}
        self.lock = threading.Lock()
        self.current_dir = os.path.dirname(os.path.abspath(__file__))
        
        # Check if running in Docker container
        if os.path.exists('/app/JobGetOrder'):
            # Running in Docker container
            self.project_root = '/app'
        else:
            # Running locally
            self.project_root = os.path.dirname(self.current_dir)
    
    def create_user_workspace(self, user_id: str) -> str:
        """Create isolated workspace for user"""
        with self.lock:
            if user_id not in self.user_workspaces:
                # Create user-specific workspace
                user_workspace = os.path.join(self.project_root, 'JobGetOrder', f'User_{user_id}')
                os.makedirs(user_workspace, exist_ok=True)
                
                # Create marketplace subfolders
                marketplaces = ['Shopee', 'Lazada', 'Blibli', 'Desty', 'Ginee', 'Tiktok', 'Zalora']
                for marketplace in marketplaces:
                    marketplace_path = os.path.join(user_workspace, marketplace)
                    os.makedirs(marketplace_path, exist_ok=True)
                
                self.user_workspaces[user_id] = user_workspace
                print(f"✅ Created workspace for user {user_id}: {user_workspace}")
            
            return self.user_workspaces[user_id]
    
    def get_user_workspace(self, user_id: str) -> str:
        """Get user workspace path"""
        return self.user_workspaces.get(user_id, self.create_user_workspace(user_id))
    
    def generate_unique_filename(self, original_filename: str, user_id: str) -> str:
        """Generate unique filename with user ID and timestamp"""
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        name, ext = os.path.splitext(original_filename)
        return f"{name}_User{user_id}_{timestamp}{ext}"
    
    def get_user_orderlist_path(self, user_id: str, marketplace: str) -> str:
        """Get user-specific Orderlist.txt path"""
        user_workspace = self.get_user_workspace(user_id)
        marketplace_path = os.path.join(user_workspace, marketplace)
        return os.path.join(marketplace_path, 'Orderlist.txt')
    
    def get_user_config_path(self, user_id: str, marketplace: str, brand_name: str) -> str:
        """Get user-specific config file path"""
        user_workspace = self.get_user_workspace(user_id)
        marketplace_path = os.path.join(user_workspace, marketplace)
        return os.path.join(marketplace_path, f'{brand_name}_{marketplace.upper()}.config')
    
    def copy_net_apps_to_user_workspace(self, user_id: str, marketplace: str):
        """Copy .NET apps to user workspace"""
        user_workspace = self.get_user_workspace(user_id)
        user_marketplace_path = os.path.join(user_workspace, marketplace)
        
        # Source marketplace path
        source_marketplace_path = os.path.join(self.project_root, 'JobGetOrder', marketplace)
        
        if not os.path.exists(source_marketplace_path):
            return
        
        # Copy .NET executable and dependencies
        import shutil
        for file in os.listdir(source_marketplace_path):
            if file.endswith(('.exe', '.dll', '.config', '.xml')):
                source_file = os.path.join(source_marketplace_path, file)
                dest_file = os.path.join(user_marketplace_path, file)
                if not os.path.exists(dest_file):
                    shutil.copy2(source_file, dest_file)
    
    def add_to_upload_queue(self, user_id: str, filename: str, file_data: bytes) -> str:
        """Add upload to queue and return task ID"""
        task_id = f"upload_{user_id}_{int(time.time())}"
        
        with self.lock:
            self.upload_queue.append({
                'task_id': task_id,
                'user_id': user_id,
                'filename': filename,
                'file_data': file_data,
                'status': 'queued',
                'created_at': datetime.now()
            })
        
        print(f"📋 Added upload to queue: {task_id} for user {user_id}")
        return task_id
    
    def process_upload_queue(self):
        """Process upload queue sequentially"""
        while True:
            with self.lock:
                if not self.upload_queue:
                    time.sleep(1)
                    continue
                
                # Get next upload from queue
                upload_task = self.upload_queue.pop(0)
            
            try:
                print(f"🔄 Processing upload: {upload_task['task_id']}")
                upload_task['status'] = 'processing'
                
                # Process the upload (this would call the actual upload processing logic)
                # For now, just simulate processing
                time.sleep(2)
                
                upload_task['status'] = 'completed'
                print(f"✅ Completed upload: {upload_task['task_id']}")
                
            except Exception as e:
                upload_task['status'] = 'failed'
                upload_task['error'] = str(e)
                print(f"❌ Failed upload: {upload_task['task_id']} - {str(e)}")
    
    def get_upload_status(self, task_id: str) -> Optional[Dict]:
        """Get upload status by task ID"""
        with self.lock:
            for upload in self.upload_queue:
                if upload['task_id'] == task_id:
                    return upload
        
        # Check processing queue
        for upload in self.processing_queue:
            if upload['task_id'] == task_id:
                return upload
        
        return None
    
    def cleanup_user_workspace(self, user_id: str, older_than_hours: int = 24):
        """Clean up old files in user workspace"""
        try:
            user_workspace = self.get_user_workspace(user_id)
            current_time = time.time()
            cutoff_time = current_time - (older_than_hours * 3600)
            
            for root, dirs, files in os.walk(user_workspace):
                for file in files:
                    file_path = os.path.join(root, file)
                    if os.path.getmtime(file_path) < cutoff_time:
                        os.remove(file_path)
                        print(f"🗑️ Cleaned up old file: {file_path}")
        
        except Exception as e:
            print(f"❌ Error cleaning up workspace for user {user_id}: {str(e)}")
    
    def get_queue_status(self) -> Dict:
        """Get current queue status"""
        with self.lock:
            return {
                'upload_queue_length': len(self.upload_queue),
                'processing_queue_length': len(self.processing_queue),
                'active_users': len(self.user_workspaces),
                'user_workspaces': list(self.user_workspaces.keys())
            }

# Global instance
multi_user_handler = MultiUserHandler()

# Start queue processor in background thread
def start_queue_processor():
    """Start the upload queue processor"""
    processor_thread = threading.Thread(target=multi_user_handler.process_upload_queue, daemon=True)
    processor_thread.start()
    print("🚀 Started upload queue processor")

# Start the processor when module is imported
start_queue_processor()
