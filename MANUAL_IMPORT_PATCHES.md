# Two manual import changes

If you do not run `APPLY_PRODUCTION_QA_FIX2.py`, make these two edits directly
in GitHub.

## components/portal/awards-management-live.tsx

Change:

```ts
} from '@/lib/admin/actions'
```

to:

```ts
} from '@/lib/admin/scoped-awards-actions'
```

## components/portal/award-edition-management.tsx

Change:

```ts
} from '@/lib/admin/award-edition-actions'
```

to:

```ts
} from '@/lib/admin/scoped-award-edition-actions'
```
