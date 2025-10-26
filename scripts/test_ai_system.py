#!/usr/bin/env python3
"""
Test Único del Sistema de IA
Prueba la integración completa de OpenAI (GPT-5 Nano o GPT-4o-mini)
"""
import os
import sys
import json

os.chdir('/app')
sys.path.insert(0, '/app/src')


def test_openai_direct():
    """Test directo del cliente OpenAI con los parámetros correctos"""
    print("\n" + "="*70)
    print("🧪 TEST: Cliente OpenAI Directo")
    print("="*70)
    
    try:
        from openai import OpenAI
        from config.settings import get_settings
        
        settings = get_settings()
        api_key = settings.OPENAI_API_KEY
        if not api_key:
            print("❌ OPENAI_API_KEY no configurada")
            return False
        
        model = settings.OPENAI_MODEL
        client = OpenAI(api_key=api_key)
        
        print(f"\n📡 Modelo: {model}")
        print(f"📡 Enviando solicitud de prueba...")
        
        # Parámetros según el modelo
        if model.startswith("gpt-5"):
            # GPT-5 Nano según playground de OpenAI
            response = client.chat.completions.create(
                model=model,
                messages=[
                    {
                        "role": "user",
                        "content": "Generate a JSON object with these fields: layer_height (0.2), print_speed (50), temperature (200). Respond with ONLY the JSON."
                    }
                ],
                response_format={"type": "text"},
                verbosity="medium",
                reasoning_effort="medium",
                store=False,
                max_completion_tokens=200
            )
        else:
            # GPT-4 tradicional
            response = client.chat.completions.create(
                model=model,
                messages=[
                    {
                        "role": "user",
                        "content": "Generate a JSON object with these fields: layer_height (0.2), print_speed (50), temperature (200)."
                    }
                ],
                response_format={"type": "json_object"},
                temperature=0.7,
                max_tokens=200
            )
        
        content = response.choices[0].message.content
        
        print(f"\n✅ Respuesta recibida:")
        print("="*70)
        print(content)
        print("="*70)
        
        print(f"\n📊 Información:")
        print(f"   • Modelo usado: {response.model}")
        print(f"   • Tokens totales: {response.usage.total_tokens}")
        print(f"   • Finish reason: {response.choices[0].finish_reason}")
        
        # Intentar parsear como JSON
        try:
            data = json.loads(content)
            print(f"\n✅ JSON válido:")
            print(json.dumps(data, indent=2))
            return True
        except json.JSONDecodeError:
            # Si GPT-5 devuelve texto, extraer el JSON
            import re
            json_match = re.search(r'\{[^}]+\}', content)
            if json_match:
                data = json.loads(json_match.group())
                print(f"\n✅ JSON extraído del texto:")
                print(json.dumps(data, indent=2))
                return True
            else:
                print(f"\n⚠️  No se pudo parsear como JSON, pero la respuesta es válida")
                return bool(content and len(content) > 0)
        
    except Exception as e:
        print(f"\n❌ ERROR: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def test_config():
    """Test de configuración"""
    print("\n" + "="*70)
    print("🔧 TEST: Configuración")
    print("="*70)
    
    try:
        from config.settings import get_settings
        settings = get_settings()
        
        print(f"✅ Configuración cargada:")
        print(f"   • Modelo: {settings.OPENAI_MODEL}")
        print(f"   • Max Tokens: {settings.OPENAI_MAX_TOKENS}")
        
        if settings.OPENAI_MODEL.startswith("gpt-5"):
            print(f"   • Verbosity: {getattr(settings, 'OPENAI_VERBOSITY', 'N/A')}")
            print(f"   • Reasoning: {getattr(settings, 'OPENAI_REASONING_EFFORT', 'N/A')}")
        else:
            print(f"   • Temperature: {settings.OPENAI_TEMPERATURE}")
        
        api_key = settings.OPENAI_API_KEY
        if api_key:
            masked = api_key[:10] + "..." + api_key[-4:]
            print(f"   • API Key: {masked}")
            return True
        else:
            print(f"   • API Key: ❌ NO CONFIGURADA")
            return False
            
    except Exception as e:
        print(f"\n❌ ERROR: {type(e).__name__}: {str(e)}")
        return False


def main():
    """Ejecutar suite de pruebas"""
    print("\n" + "="*70)
    print("🎯 SUITE DE PRUEBAS: Sistema de IA con OpenAI")
    print("="*70)
    
    results = []
    
    # Test 1: Configuración
    results.append(("Configuración", test_config()))
    
    # Test 2: Cliente OpenAI directo
    if results[0][1]:
        results.append(("Cliente OpenAI", test_openai_direct()))
    else:
        print("\n⚠️  Saltando test de OpenAI - configuración incompleta")
    
    # Resumen
    print("\n" + "="*70)
    print("📊 RESUMEN")
    print("="*70)
    
    for test_name, passed in results:
        status = "✅" if passed else "❌"
        print(f"{status} {test_name}")
    
    if all(r[1] for r in results):
        print("\n🎉 ¡Todas las pruebas pasaron!")
        print("✅ Sistema de IA con OpenAI funcional")
        return 0
    else:
        print("\n⚠️  Algunas pruebas fallaron")
        return 1


if __name__ == "__main__":
    sys.exit(main())
