import os
import io
from typing import Optional
from gtts import gTTS
import tempfile
import pygame
from pygame import mixer


def text_to_speech(text: str, language: str = "en", slow: bool = False) -> bytes:
    # Create gTTS object
    tts = gTTS(text=text, lang=language, slow=slow)
    
    # Save to temporary file and read bytes
    with tempfile.NamedTemporaryFile(delete=False, suffix='.mp3') as tmp_file:
        tts.save(tmp_file.name)
        tmp_file.seek(0)
        
        # Read the audio bytes
        with open(tmp_file.name, 'rb') as audio_file:
            audio_bytes = audio_file.read()
        
        # Clean up temp file
        os.unlink(tmp_file.name)
        
    return audio_bytes


def text_to_speech_file(text: str, filename: str, language: str = "en", slow: bool = False) -> str:
    # Add .mp3 extension if not present
    if not filename.endswith('.mp3'):
        filename += '.mp3'
    
    # Create gTTS object and save
    tts = gTTS(text=text, lang=language, slow=slow)
    tts.save(filename)
    
    return filename


def speak_text(text: str, language: str = "en", slow: bool = False) -> bool:
    """
    Convert text to speech and play it directly without saving to file
    
    Args:
        text: Text to speak
        language: Language code (en, es, fr, de, etc.)
        slow: Whether to speak slowly
        
    Returns:
        True if successful, False otherwise
    """
    try:
        # Initialize pygame mixer if not already initialized
        if not mixer.get_init():
            mixer.init()
        
        # Create gTTS object
        tts = gTTS(text=text, lang=language, slow=slow)
        
        # Save to temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix='.mp3') as tmp_file:
            tts.save(tmp_file.name)
            
            # Load and play the audio
            mixer.music.load(tmp_file.name)
            mixer.music.play()
            
            # Wait for playback to finish
            while mixer.music.get_busy():
                pygame.time.wait(100)
            
            # Clean up temp file
            os.unlink(tmp_file.name)
            
        return True
        
    except Exception as e:
        print(f"Error playing audio: {e}")
        return False


def speak_text_async(text: str, language: str = "en", slow: bool = False) -> bool:
    """
    Convert text to speech and start playing it without waiting for completion
    
    Args:
        text: Text to speak
        language: Language code (en, es, fr, de, etc.)
        slow: Whether to speak slowly
        
    Returns:
        True if started successfully, False otherwise
    """
    try:
        # Initialize pygame mixer if not already initialized
        if not mixer.get_init():
            mixer.init()
        
        # Create gTTS object
        tts = gTTS(text=text, lang=language, slow=slow)
        
        # Save to temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix='.mp3') as tmp_file:
            tts.save(tmp_file.name)
            
            # Load and start playing the audio (don't wait)
            mixer.music.load(tmp_file.name)
            mixer.music.play()
            
            # Note: temp file cleanup happens when music stops
            # You might want to handle cleanup differently for async
            
        return True
        
    except Exception as e:
        print(f"Error starting audio playback: {e}")
        return False


def get_available_languages():
    """Get list of supported language codes"""
    return {
        'en': 'English',
        'es': 'Spanish', 
        'fr': 'French',
        'de': 'German',
        'it': 'Italian',
        'pt': 'Portuguese',
        'ru': 'Russian',
        'ja': 'Japanese',
        'ko': 'Korean',
        'zh': 'Chinese',
        'ar': 'Arabic',
        'hi': 'Hindi',
        'nl': 'Dutch',
        'sv': 'Swedish',
        'da': 'Danish',
        'no': 'Norwegian',
        'fi': 'Finnish',
        'pl': 'Polish',
        'tr': 'Turkish',
        'th': 'Thai'
    }
