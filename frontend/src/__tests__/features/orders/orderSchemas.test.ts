import { createOrderSchema, paymentDialogSchema } from '@/features/orders/orderSchemas'
import { OrderChannel, PaymentMode } from '@/types/enums'

describe('createOrderSchema', () => {
  it('valid_WhenChannelIsTakeaway_RequiresNoTable', async () => {
    await expect(
      createOrderSchema.validate({ channel: OrderChannel.Takeaway, memberCount: 2 }),
    ).resolves.toBeTruthy()
  })

  it('valid_WhenChannelIsDineIn_WithTable', async () => {
    await expect(
      createOrderSchema.validate({
        channel: OrderChannel.DineIn,
        memberCount: 1,
        restaurantTableId: 'some-uuid',
      }),
    ).resolves.toBeTruthy()
  })

  it('invalid_WhenChannelIsDineIn_WithoutTable', async () => {
    await expect(
      createOrderSchema.validate({ channel: OrderChannel.DineIn, memberCount: 2 }),
    ).rejects.toThrow('Table is required')
  })

  it('invalid_WhenMemberCountIsZero', async () => {
    await expect(
      createOrderSchema.validate({ channel: OrderChannel.Takeaway, memberCount: 0 }),
    ).rejects.toThrow()
  })

  it('invalid_WhenMemberCountIsDecimal', async () => {
    await expect(
      createOrderSchema.validate({ channel: OrderChannel.Takeaway, memberCount: 1.5 }),
    ).rejects.toThrow()
  })

  it('invalid_WhenChannelIsMissing', async () => {
    await expect(
      createOrderSchema.validate({ memberCount: 1 }),
    ).rejects.toThrow('Channel is required')
  })

  it('valid_WhenCustomerNameIsAbsent', async () => {
    await expect(
      createOrderSchema.validate({ channel: OrderChannel.Takeaway, memberCount: 1 }),
    ).resolves.toBeTruthy()
  })

  it('invalid_WhenCustomerNameExceeds200Chars', async () => {
    await expect(
      createOrderSchema.validate({
        customerName: 'a'.repeat(201),
        channel: OrderChannel.Takeaway,
        memberCount: 1,
      }),
    ).rejects.toThrow()
  })
})

describe('paymentDialogSchema', () => {
  it('valid_WithValidPaymentMode', async () => {
    await expect(
      paymentDialogSchema.validate({ paymentMode: PaymentMode.Cash }),
    ).resolves.toBeTruthy()
  })

  it('invalid_WhenPaymentModeIsMissing', async () => {
    await expect(
      paymentDialogSchema.validate({}),
    ).rejects.toThrow('Please select a payment mode')
  })

  it('valid_WithNote', async () => {
    await expect(
      paymentDialogSchema.validate({ paymentMode: PaymentMode.UPI, note: 'test note' }),
    ).resolves.toBeTruthy()
  })

  it('invalid_WhenNoteExceeds500Chars', async () => {
    await expect(
      paymentDialogSchema.validate({ paymentMode: PaymentMode.Cash, note: 'a'.repeat(501) }),
    ).rejects.toThrow()
  })
})
