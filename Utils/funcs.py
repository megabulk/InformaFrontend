import os, json
from base64 import b64encode, b64decode

def b64(srcPath, mode, destPath=None):
	with open(srcPath, 'rb') as file:
		if mode == "e": content = b64encode(file.read())
		elif mode == "d": content = b64decode(file.read())
		
		if destPath is not None:
			with open(destPath, 'wb+') as destFile: destFile.write(content)
		else:
			return content

def saveInformaCamDirective(path):
	from conf import INFORMA_CONF_ROOT
	secrets = os.path.join(INFORMA_CONF_ROOT, "informa.secrets.json")
	
	try:
		with open(path, 'rb') as entry:
			value = b64encode(entry.read())
		
			try:
				with open(secrets, 'rb') as c: config = json.loads(c.read())
			except IOError as e: config = {}
		
			config[os.path.basename(path)] = value
			with open(secrets, 'wb+') as c: c.write(json.dumps(config))
			return True
			
	except Exception as e: 
		print e
		return False