# Troubleshooting Guide

## Common Issues

### Build Errors

**Issue:** Module not found
```
Solution: Run npm install
```

**Issue:** TypeScript errors
```
Solution: Check tsconfig.json, run npm run type-check
```

### Runtime Errors

**Issue:** Supabase connection error
```
Solution:
1. Check .env.local has correct keys
2. Verify Supabase project is active
3. Check network connection
```

**Issue:** Authentication not working
```
Solution:
1. Clear cookies
2. Check Supabase Auth is enabled
3. Verify redirect URLs in Supabase dashboard
```

### Performance Issues

**Issue:** Slow page loads
```
Solution:
1. Check database indexes
2. Reduce initial data fetching
3. Enable caching
4. Use pagination
```

**Issue:** High memory usage
```
Solution:
1. Kill old Next.js processes
2. Restart dev server
3. Clear .next directory
```

### Database Issues

**Issue:** Migration fails
```
Solution:
1. Check migration order
2. Verify SQL syntax
3. Check for existing tables
4. Run migrations one by one
```

**Issue:** RLS errors
```
Solution:
1. Check user has proper role
2. Verify RLS policies
3. Use service role for admin operations
```

### UI Issues

**Issue:** Styles not loading
```
Solution:
1. Clear .next cache
2. Restart dev server
3. Check Tailwind config
```

**Issue:** Components not rendering
```
Solution:
1. Check console for errors
2. Verify imports
3. Check component props
```

## Debug Mode

Enable debug logging:
```bash
DEBUG=* npm run dev
```

## Support
For additional help, check GitHub issues or contact support.

