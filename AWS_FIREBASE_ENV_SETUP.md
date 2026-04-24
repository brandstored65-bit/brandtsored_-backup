# AWS Firebase Env Setup (Copy/Paste)

Use this to set Firebase Admin credentials on your AWS server.

## Important Security Note

The service account private key shown in chat is now exposed. Rotate this key in Google Cloud first, then use the new JSON.

## Option 1: Direct .env Entry (Template)

Paste this in your server .env file as a single line:

```env
FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"brandstored-ecommerce","private_key_id":"<PRIVATE_KEY_ID>","private_key":"-----BEGIN PRIVATE KEY-----\n<PRIVATE_KEY_CONTENT>\n-----END PRIVATE KEY-----\n","client_email":"firebase-adminsdk-fbsvc@brandstored-ecommerce.iam.gserviceaccount.com","client_id":"<CLIENT_ID>","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40brandstored-ecommerce.iam.gserviceaccount.com","universe_domain":"googleapis.com"}'
GOOGLE_CLOUD_PROJECT=brandstored-ecommerce
GCLOUD_PROJECT=brandstored-ecommerce
```

## Option 2: Generate Exact Line From JSON (Recommended)

If your server has the service account JSON file, run:

```bash
node -e "const fs=require('fs'); const p='brandstored-ecommerce-firebase-adminsdk-fbsvc-NEWKEY.json'; const j=JSON.parse(fs.readFileSync(p,'utf8')); process.stdout.write('FIREBASE_SERVICE_ACCOUNT_KEY=\''+JSON.stringify(j)+'\'\nGOOGLE_CLOUD_PROJECT='+j.project_id+'\nGCLOUD_PROJECT='+j.project_id+'\n');"
```

Then append output to .env (or paste manually).

## Validate On Server

```bash
npm run build
pm2 restart all --update-env
```

If build prints Firebase Admin initialized successfully for project brandstored-ecommerce, env is set correctly.
