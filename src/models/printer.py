# Modelo de impresora para lógica interna

class Printer:
    def __init__(self, id, name, model, ip, status="offline", capabilities=None, location=None):
        self.id = id
        self.name = name
        self.model = model
        self.ip = ip
        self.status = status
        self.capabilities = capabilities
        self.location = location
