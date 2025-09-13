"""
Configuration Management
Handles environment variables and application settings
"""
import os
from typing import List, Dict, Any
from dataclasses import dataclass
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

@dataclass
class APIConfig:
    """API service configuration"""
    anthropic_api_key: str
    cerebras_api_key: str
    mcp_endpoint: str = ""

@dataclass
class ServerConfig:
    """Server configuration"""
    host: str = "0.0.0.0"
    port: int = 8000
    debug: bool = True
    cors_origins: List[str] = None
    
    def __post_init__(self):
        if self.cors_origins is None:
            self.cors_origins = ["http://localhost:3000", "http://localhost:5173"]

@dataclass
class SessionConfig:
    """Session management configuration"""
    timeout: int = 3600  # seconds
    max_sessions: int = 100
    cleanup_interval: int = 300  # seconds
    persistent_storage: bool = False

@dataclass
class AudioConfig:
    """Audio processing configuration"""
    sample_rate: int = 16000
    channels: int = 1
    chunk_size: int = 1024
    vad_threshold: float = 0.01
    silence_duration: float = 1.0
    mock_audio: bool = True  # For development

@dataclass
class AIModelConfig:
    """AI model configuration"""
    claude_model: str = "claude-3-sonnet-20240229"
    claude_max_tokens: int = 1000
    cerebras_model: str = "llama3.1-8b"
    cerebras_max_tokens: int = 200
    cerebras_temperature: float = 0.3

@dataclass
class TutoringConfig:
    """Tutoring behavior configuration"""
    max_ai_speaking_time: float = 15.0  # seconds
    user_stall_threshold: float = 30.0  # seconds
    interruption_cooldown: float = 5.0  # seconds
    hint_probability: float = 0.7
    correction_probability: float = 0.9

@dataclass
class AnnotationConfig:
    """Visual annotation configuration"""
    lifetime: int = 5000  # milliseconds
    cursor_speed: int = 300  # pixels/second
    min_gap: int = 200  # milliseconds between annotations
    fade_duration: int = 500  # milliseconds

@dataclass
class KnowledgeGraphConfig:
    """Knowledge graph configuration"""
    update_interval: int = 30  # seconds
    mastery_threshold: float = 0.4
    importance_weight: float = 0.5
    max_concepts: int = 100
    learning_rate: float = 0.1

class ApplicationConfig:
    """Main application configuration"""
    
    def __init__(self):
        self.api = self._load_api_config()
        self.server = self._load_server_config()
        self.session = self._load_session_config()
        self.audio = self._load_audio_config()
        self.ai_models = self._load_ai_model_config()
        self.tutoring = self._load_tutoring_config()
        self.annotations = self._load_annotation_config()
        self.knowledge_graph = self._load_kg_config()
        
        # Validate required configurations
        self._validate_config()
    
    def _load_api_config(self) -> APIConfig:
        """Load API configuration from environment"""
        return APIConfig(
            anthropic_api_key=os.getenv("ANTHROPIC_API_KEY", ""),
            cerebras_api_key=os.getenv("CEREBRAS_API_KEY", ""),
            mcp_endpoint=os.getenv("MCP_ENDPOINT", "")
        )
    
    def _load_server_config(self) -> ServerConfig:
        """Load server configuration"""
        cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:5173")
        return ServerConfig(
            host=os.getenv("HOST", "0.0.0.0"),
            port=int(os.getenv("PORT", "8000")),
            debug=os.getenv("DEBUG", "true").lower() == "true",
            cors_origins=cors_origins.split(",") if cors_origins else []
        )
    
    def _load_session_config(self) -> SessionConfig:
        """Load session configuration"""
        return SessionConfig(
            timeout=int(os.getenv("SESSION_TIMEOUT", "3600")),
            max_sessions=int(os.getenv("MAX_SESSIONS", "100")),
            cleanup_interval=int(os.getenv("CLEANUP_INTERVAL", "300")),
            persistent_storage=os.getenv("PERSISTENT_STORAGE", "false").lower() == "true"
        )
    
    def _load_audio_config(self) -> AudioConfig:
        """Load audio configuration"""
        return AudioConfig(
            sample_rate=int(os.getenv("AUDIO_SAMPLE_RATE", "16000")),
            channels=int(os.getenv("AUDIO_CHANNELS", "1")),
            chunk_size=int(os.getenv("AUDIO_CHUNK_SIZE", "1024")),
            vad_threshold=float(os.getenv("VAD_THRESHOLD", "0.01")),
            silence_duration=float(os.getenv("SILENCE_DURATION", "1.0")),
            mock_audio=os.getenv("MOCK_AUDIO", "true").lower() == "true"
        )
    
    def _load_ai_model_config(self) -> AIModelConfig:
        """Load AI model configuration"""
        return AIModelConfig(
            claude_model=os.getenv("CLAUDE_MODEL", "claude-3-sonnet-20240229"),
            claude_max_tokens=int(os.getenv("CLAUDE_MAX_TOKENS", "1000")),
            cerebras_model=os.getenv("CEREBRAS_MODEL", "llama3.1-8b"),
            cerebras_max_tokens=int(os.getenv("CEREBRAS_MAX_TOKENS", "200")),
            cerebras_temperature=float(os.getenv("CEREBRAS_TEMPERATURE", "0.3"))
        )
    
    def _load_tutoring_config(self) -> TutoringConfig:
        """Load tutoring configuration"""
        return TutoringConfig(
            max_ai_speaking_time=float(os.getenv("MAX_AI_SPEAKING_TIME", "15.0")),
            user_stall_threshold=float(os.getenv("USER_STALL_THRESHOLD", "30.0")),
            interruption_cooldown=float(os.getenv("INTERRUPTION_COOLDOWN", "5.0")),
            hint_probability=float(os.getenv("HINT_PROBABILITY", "0.7")),
            correction_probability=float(os.getenv("CORRECTION_PROBABILITY", "0.9"))
        )
    
    def _load_annotation_config(self) -> AnnotationConfig:
        """Load annotation configuration"""
        return AnnotationConfig(
            lifetime=int(os.getenv("ANNOTATION_LIFETIME", "5000")),
            cursor_speed=int(os.getenv("CURSOR_SPEED", "300")),
            min_gap=int(os.getenv("MIN_ANNOTATION_GAP", "200")),
            fade_duration=int(os.getenv("ANNOTATION_FADE_DURATION", "500"))
        )
    
    def _load_kg_config(self) -> KnowledgeGraphConfig:
        """Load knowledge graph configuration"""
        return KnowledgeGraphConfig(
            update_interval=int(os.getenv("KG_UPDATE_INTERVAL", "30")),
            mastery_threshold=float(os.getenv("KG_MASTERY_THRESHOLD", "0.4")),
            importance_weight=float(os.getenv("KG_IMPORTANCE_WEIGHT", "0.5")),
            max_concepts=int(os.getenv("KG_MAX_CONCEPTS", "100")),
            learning_rate=float(os.getenv("KG_LEARNING_RATE", "0.1"))
        )
    
    def _validate_config(self):
        """Validate required configuration values"""
        required_keys = [
            "ANTHROPIC_API_KEY",
            "CEREBRAS_API_KEY"
        ]
        
        missing_keys = []
        for key in required_keys:
            if not os.getenv(key):
                missing_keys.append(key)
        
        if missing_keys:
            print(f"⚠️  Missing required environment variables: {', '.join(missing_keys)}")
            print("The application will use mock services for missing integrations.")
    
    def get_summary(self) -> Dict[str, Any]:
        """Get configuration summary"""
        return {
            "server": {
                "host": self.server.host,
                "port": self.server.port,
                "debug": self.server.debug
            },
            "api_keys_configured": {
                "anthropic": bool(self.api.anthropic_api_key),
                "cerebras": bool(self.api.cerebras_api_key)
            },
            "audio": {
                "sample_rate": self.audio.sample_rate,
                "mock_mode": self.audio.mock_audio
            },
            "tutoring": {
                "max_speaking_time": self.tutoring.max_ai_speaking_time,
                "stall_threshold": self.tutoring.user_stall_threshold
            },
            "knowledge_graph": {
                "mastery_threshold": self.knowledge_graph.mastery_threshold,
                "max_concepts": self.knowledge_graph.max_concepts
            }
        }

# Global configuration instance
config = ApplicationConfig()

# Utility functions
def get_config() -> ApplicationConfig:
    """Get the global configuration instance"""
    return config

def is_development() -> bool:
    """Check if running in development mode"""
    return config.server.debug

def get_api_keys_status() -> Dict[str, bool]:
    """Get status of all API keys"""
    return {
        "anthropic": bool(config.api.anthropic_api_key),
        "cerebras": bool(config.api.cerebras_api_key),
        "mcp": bool(config.api.mcp_endpoint)
    }

def print_config_summary():
    """Print configuration summary for debugging"""
    summary = config.get_summary()
    print("🔧 Configuration Summary:")
    print(f"   Server: {summary['server']['host']}:{summary['server']['port']}")
    print(f"   Debug: {summary['server']['debug']}")
    print(f"   API Keys: {sum(summary['api_keys_configured'].values())}/2 configured")
    print(f"   Audio: {summary['audio']['sample_rate']}Hz (mock: {summary['audio']['mock_mode']})")
    print(f"   Tutoring: {summary['tutoring']['stall_threshold']}s stall threshold")
    print(f"   Knowledge Graph: {summary['knowledge_graph']['max_concepts']} max concepts")

# Environment setup helper
def create_env_template():
    """Create environment template for easy setup"""
    template = """# AI Whiteboard Tutor - Environment Configuration
# Copy this to .env and fill in your API keys

# Required API Keys
ANTHROPIC_API_KEY=your_anthropic_api_key_here
CEREBRAS_API_KEY=your_cerebras_api_key_here

# Optional
MCP_ENDPOINT=your_mcp_endpoint_here

# Server Settings (optional)
HOST=0.0.0.0
PORT=8000
DEBUG=true
CORS_ORIGINS=http://localhost:3000,http://localhost:5173

# Development Settings
MOCK_AUDIO=true
"""
    
    with open("/Users/vedantgaur/Downloads/Projects/whiteboard/backend/env.template", "w") as f:
        f.write(template)
    
    print("📝 Created env.template - copy to .env and configure your API keys")
