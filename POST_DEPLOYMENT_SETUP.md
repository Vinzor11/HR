# Post-Deployment Setup Guide

## ✅ Deployment Successful! Now What?

Your HR system is now live on Railway. Follow these steps to complete the setup.

---

## Step 1: Access Your Application

1. **Get your Railway URL:**
   - In Railway dashboard, go to your service
   - Click on the service to see the URL
   - It should be something like: `https://your-app-name.railway.app`

2. **Visit the URL in your browser**
   - You should see your Laravel application

---

## Step 2: Set Up Database (If Not Done)

### Option A: Add MySQL Database in Railway

1. **In Railway Dashboard:**
   - Click "New" → "Database" → "MySQL"
   - Railway will create a MySQL database automatically

2. **Get Database Credentials:**
   - Click on the database service
   - Go to "Variables" tab
   - Copy these values:
     - `MYSQLHOST`
     - `MYSQLPORT`
     - `MYSQLDATABASE`
     - `MYSQLUSER`
     - `MYSQLPASSWORD`

3. **Add to Your App's Environment Variables:**
   - Go to your app service → "Variables"
   - Add/Update these:
     ```
     DB_CONNECTION=mysql
     DB_HOST=<MYSQLHOST value>
     DB_PORT=<MYSQLPORT value>
     DB_DATABASE=<MYSQLDATABASE value>
     DB_USERNAME=<MYSQLUSER value>
     DB_PASSWORD=<MYSQLPASSWORD value>
     ```

4. **Redeploy your app** (Railway will auto-redeploy when env vars change)

### Option B: Use External Database

If you have an external MySQL database, just add the connection details to environment variables.

---

## Step 3: Run Database Setup Commands

After database is configured, run these commands via Railway CLI or dashboard:

### Via Railway Dashboard:
1. Go to your service → "Deployments" → Latest deployment
2. Click "View Logs" or use "Run Command" feature

### Via Railway CLI:
```bash
# Install Railway CLI (if not installed)
npm i -g @railway/cli

# Login
railway login

# Link to your project
railway link

# Run migrations
railway run php artisan migrate --force

# Generate Passport keys (if not already done)
railway run php artisan passport:keys

# Seed database (create super admin)
railway run php artisan db:seed
```

---

## Step 4: Create Super Admin User

### Option A: Via Seeder (Recommended)
If you have a `SuperAdminSeeder`, it should run with `db:seed`. Check your seeders.

### Option B: Via Tinker
```bash
railway run php artisan tinker
```

Then in tinker:
```php
$user = \App\Models\User::create([
    'name' => 'Super Admin',
    'email' => 'admin@essu.edu.ph',
    'password' => bcrypt('your-secure-password'),
    'email_verified_at' => now(),
]);

$user->assignRole('super-admin');
```

### Option C: Via Registration Page
- Visit: `https://your-app.railway.app/register`
- Register the first user
- Then assign super-admin role via tinker or database

---

## Step 5: Configure Environment Variables

Make sure these are set in Railway → Your Service → Variables:

### Required Variables:
```env
APP_NAME="ESSU HRMS"
APP_ENV=production
APP_DEBUG=false
APP_URL=https://your-app.railway.app

# Database (from Step 2)
DB_CONNECTION=mysql
DB_HOST=...
DB_PORT=...
DB_DATABASE=...
DB_USERNAME=...
DB_PASSWORD=...

# Session & Cache
SESSION_DRIVER=database
SESSION_LIFETIME=120
CACHE_DRIVER=file
QUEUE_CONNECTION=database

# Mail Configuration (Important!)
MAIL_MAILER=smtp
MAIL_HOST=smtp.gmail.com  # or your SMTP server
MAIL_PORT=587
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-app-password
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=noreply@essu.edu.ph
MAIL_FROM_NAME="${APP_NAME}"
```

---

## Step 6: Test Your Application

1. **Login:**
   - Visit: `https://your-app.railway.app/login`
   - Use your super admin credentials

2. **Test Key Features:**
   - ✅ Dashboard loads
   - ✅ Can create users
   - ✅ Can manage employees
   - ✅ Can create roles/permissions
   - ✅ OAuth clients page works

3. **Test OAuth (If Needed):**
   - Go to: `https://your-app.railway.app/oauth/clients`
   - Create an OAuth client
   - Test the OAuth flow

---

## Step 7: Set Up OAuth Clients

If you need OAuth for other systems:

1. **Login to your HR system**
2. **Navigate to:** `/oauth/clients`
3. **Create clients** for:
   - Accounting system
   - Payroll system
   - Other integrated systems
4. **Use production URLs** for redirect URIs:
   - `https://accounting.essu.edu.ph/oauth/callback`
   - `https://payroll.essu.edu.ph/oauth/callback`

---

## Step 8: Set Up Custom Domain (Optional)

1. **In Railway:**
   - Go to your service → "Settings" → "Networking"
   - Click "Generate Domain" or "Add Custom Domain"
   - Follow instructions to add your domain

2. **Update Environment:**
   - Update `APP_URL` to your custom domain
   - Redeploy

---

## Step 9: Set Up Backups (Important!)

### Option A: Railway Automatic Backups
- Railway Pro plans include automatic backups
- Check your plan settings

### Option B: Manual Backup Script
Create a scheduled backup via Railway Cron or external service.

---

## Step 10: Monitor Your Application

1. **Check Logs:**
   - Railway Dashboard → Your Service → "Logs"
   - Monitor for errors

2. **Set Up Monitoring:**
   - Use Railway's built-in monitoring
   - Or integrate external services (Sentry, etc.)

---

## 🐛 Troubleshooting

### Issue: 500 Error
```bash
# Check logs
railway logs

# Clear cache
railway run php artisan config:clear
railway run php artisan cache:clear
```

### Issue: Database Connection Failed
- Verify database credentials in environment variables
- Check if database service is running
- Verify network connectivity

### Issue: OAuth Not Working
- Ensure `APP_URL` is correct
- Verify HTTPS is enabled (Railway does this automatically)
- Check Passport keys: `railway run php artisan passport:keys`

### Issue: Assets Not Loading
```bash
railway run npm run build
```

---

## ✅ Checklist

- [ ] Application is accessible via Railway URL
- [ ] Database is configured and connected
- [ ] Migrations have run successfully
- [ ] Passport keys are generated
- [ ] Super admin user is created
- [ ] Can login successfully
- [ ] Environment variables are configured
- [ ] Mail configuration is set (if needed)
- [ ] OAuth clients are created (if needed)
- [ ] Custom domain is set up (optional)
- [ ] Backups are configured

---

## 🎉 You're Done!

Your HR system should now be fully operational. If you encounter any issues, check the logs or refer to the troubleshooting section.

**Next Steps:**
- Start adding employees
- Configure departments and positions
- Set up training modules
- Create OAuth clients for integration

