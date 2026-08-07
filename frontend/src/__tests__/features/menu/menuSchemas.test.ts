import { menuCategorySchema, menuItemSchema } from '@/features/menu/menuSchemas'

// ── menuCategorySchema ─────────────────────────────────────────────────────────

describe('menuCategorySchema', () => {
  it('valid_WithAllFields', async () => {
    await expect(
      menuCategorySchema.validate({ name: 'Starters', sortOrder: 1, isActive: true }),
    ).resolves.toBeTruthy()
  })

  it('invalid_WhenNameIsEmpty', async () => {
    await expect(
      menuCategorySchema.validate({ name: '', sortOrder: 0, isActive: true }),
    ).rejects.toThrow()
  })

  it('invalid_WhenNameExceeds100Chars', async () => {
    await expect(
      menuCategorySchema.validate({ name: 'a'.repeat(101), sortOrder: 0, isActive: true }),
    ).rejects.toThrow()
  })

  it('invalid_WhenSortOrderIsNegative', async () => {
    await expect(
      menuCategorySchema.validate({ name: 'Starters', sortOrder: -1, isActive: true }),
    ).rejects.toThrow()
  })

  it('valid_WhenSortOrderIsZero', async () => {
    // min(0, ...) is inclusive — 0 must pass.
    await expect(
      menuCategorySchema.validate({ name: 'Starters', sortOrder: 0, isActive: true }),
    ).resolves.toBeTruthy()
  })

  it('valid_WithDefaultValues', async () => {
    // Yup applies defaults (sortOrder: 0, isActive: true) during the cast
    // step that runs inside validate(), so omitting them must still resolve.
    await expect(
      menuCategorySchema.validate({ name: 'Desserts' }),
    ).resolves.toBeTruthy()
  })
})

// ── menuItemSchema ─────────────────────────────────────────────────────────────

describe('menuItemSchema', () => {
  const validBase = {
    name: 'Butter Chicken',
    price: 250,
    categoryId: 'cat-1',
    isAvailable: true,
    displayOrder: 0,
  }

  it('valid_WithAllFields', async () => {
    await expect(menuItemSchema.validate(validBase)).resolves.toBeTruthy()
  })

  it('invalid_WhenNameIsEmpty', async () => {
    await expect(
      menuItemSchema.validate({ ...validBase, name: '' }),
    ).rejects.toThrow('Name is required')
  })

  it('invalid_WhenPriceIsZero', async () => {
    // positive() requires strictly greater than 0.
    await expect(
      menuItemSchema.validate({ ...validBase, price: 0 }),
    ).rejects.toThrow()
  })

  it('invalid_WhenPriceIsNegative', async () => {
    await expect(
      menuItemSchema.validate({ ...validBase, price: -10 }),
    ).rejects.toThrow()
  })

  it('invalid_WhenPriceIsNotANumber', async () => {
    await expect(
      menuItemSchema.validate({ ...validBase, price: 'abc' }),
    ).rejects.toThrow('Price must be a number')
  })

  it('invalid_WhenCategoryIdIsMissing', async () => {
    const { categoryId: _omit, ...withoutCategory } = validBase
    await expect(
      menuItemSchema.validate(withoutCategory),
    ).rejects.toThrow('Category is required')
  })

  it('invalid_WhenDescriptionExceeds500Chars', async () => {
    await expect(
      menuItemSchema.validate({ ...validBase, description: 'a'.repeat(501) }),
    ).rejects.toThrow()
  })

  it('valid_WhenDescriptionIsAbsent', async () => {
    // description is optional — omitting it must resolve.
    const { ...withoutDesc } = validBase
    await expect(menuItemSchema.validate(withoutDesc)).resolves.toBeTruthy()
  })
})
