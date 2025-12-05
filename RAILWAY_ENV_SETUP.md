# Railway Environment Variables Setup

## ⚠️ Your .env is Empty - Here's How to Fix It

Railway uses **Environment Variables** instead of a `.env` file. You need to add these in the Railway dashboard.

---

## Step-by-Step Setup

### 1. Go to Railway Dashboard
1. Open your Railway project
2. Click on your **service** (the app, not the database)
3. Go to **"Variables"** tab

### 2. Add These Required Variables

Click **"New Variable"** and add each one:

#### **Basic App Configuration:**
```
APP_NAME=ESSU HRMS
APP_ENV=production
APP_DEBUG=false
APP_URL=https://your-app-name.railway.app
```

**Important:** Replace `your-app-name.railway.app` with your actual Railway URL!

#### **Generate APP_KEY:**
1. In Railway, go to your service → "Deployments" → "Run Command"
2. Run: `php artisan key:generate --show`
3. Copy the output (starts with `base64:`)
4. Add as variable: `APP_KEY=<paste the generated key>`

Or Railway might auto-generate it. Check if `APP_KEY` already exists.

#### **Database Configuration:**

**If you have a MySQL database in Railway:**
1. Go to your **database service** in Railway
2. Click on it → "Variables" tab
3. You'll see variables like:
   - `MYSQLHOST`
   - `MYSQLPORT`
   - `MYSQLDATABASE`
   - `MYSQLUSER`
   - `MYSQLPASSWORD`

4. Copy these values and add to your **app service** variables:
```
DB_CONNECTION=mysql
DB_HOST=<value from MYSQLHOST>
DB_PORT=<value from MYSQLPORT>
DB_DATABASE=<value from MYSQLDATABASE>
DB_USERNAME=<value from MYSQLUSER>
DB_PASSWORD=<value from MYSQLPASSWORD>
```

**If you DON'T have a database yet:**
1. In Railway, click **"New"** → **"Database"** → **"MySQL"**
2. Railway creates it automatically
3. Then follow the steps above to get the connection details

**If using SQLite (for testing only):**
```
DB_CONNECTION=sqlite
DB_DATABASE=/tmp/database.sqlite
```

#### **Session & Cache:**
```
SESSION_DRIVER=database
SESSION_LIFETIME=120
CACHE_DRIVER=file
QUEUE_CONNECTION=database
```

#### **Mail Configuration (Optional but Recommended):**
```
MAIL_MAILER=smtp
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-app-password
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=noreply@essu.edu.ph
MAIL_FROM_NAME="ESSU HRMS"
```

---

## Quick Setup Script

After adding variables, Railway will auto-redeploy. But you can also run these commands:

1. **Generate APP_KEY** (if not auto-generated):
   ```bash
   railway run php artisan key:generate
   ```

2. **Create storage link**:
   ```bash
   railway run php artisan storage:link
   ```

3. **Clear cache**:
   ```bash
   railway run php artisan config:clear
   railway run php artisan cache:clear
   ```

---

## Minimum Required Variables

At minimum, you need these:
- `APP_NAME`
- `APP_ENV=production`
- `APP_DEBUG=false`
- `APP_URL` (your Railway URL)
- `APP_KEY` (generated)
- Database variables (DB_CONNECTION, DB_HOST, etc.)

---

## After Adding Variables

1. **Railway will automatically redeploy** when you add variables
2. **Wait for deployment to complete**
3. **Try accessing your app again**
4. **If still 500 error**, enable debug mode temporarily:
   - Set `APP_DEBUG=true`
   - Redeploy
   - Check the error page
   - **Remember to set back to `false`!**

---

## Need Help?

If you're stuck:
1. Check Railway logs: Service → "Logs"
2. Enable debug mode to see the actual error
3. Make sure all required variables are set

