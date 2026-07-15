import { PrismaClient, ProductCategory, ProductStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding banks...');
  await prisma.bank.createMany({
    data: [
      { name: 'Kotak Mahindra Bank' },
      { name: 'Airtel Payments Bank' },
      { name: 'Jio Payments Bank' },
    ],
    skipDuplicates: true,
  });

  console.log('Seeding states...');
  const stateNames = [
    'Uttar Pradesh', 'Delhi', 'Maharashtra', 'Karnataka', 'Tamil Nadu',
    'Gujarat', 'Rajasthan', 'West Bengal', 'Bihar', 'Madhya Pradesh',
  ];
  for (const name of stateNames) {
    await prisma.state.upsert({ where: { name }, update: {}, create: { name } });
  }

  const up = await prisma.state.findUnique({ where: { name: 'Uttar Pradesh' } });
  if (up) {
    await prisma.city.createMany({
      data: [
        { name: 'Meerut', stateId: up.id, pincode: '250001' },
        { name: 'Lucknow', stateId: up.id, pincode: '226001' },
        { name: 'Noida', stateId: up.id, pincode: '201301' },
      ],
      skipDuplicates: true,
    });
  }

  console.log('Seeding sample products...');
  const products: any[] = [
    // Bank Accounts
    { title: 'Kotak 811 Classic', category: ProductCategory.BANK_ACCOUNT, payoutAmount: 400, affiliateLink: 'https://example-bank.com/kotak-811-classic' },
    { title: 'Kotak 811 Super', category: ProductCategory.BANK_ACCOUNT, payoutAmount: 800, affiliateLink: 'https://example-bank.com/kotak-811-super' },
    { title: 'Airtel Payments Bank', category: ProductCategory.BANK_ACCOUNT, payoutAmount: 150, affiliateLink: 'https://example-bank.com/airtel-payments-bank' },
    { title: 'Axis Bank Savings', category: ProductCategory.BANK_ACCOUNT, payoutAmount: 500, affiliateLink: 'https://example-bank.com/axis' },
    { title: 'IndusInd Bank', category: ProductCategory.BANK_ACCOUNT, payoutAmount: 500, affiliateLink: 'https://example-bank.com/indusind' },
    // Demat
    { title: 'Lemon Demat Account', category: ProductCategory.DEMAT_ACCOUNT, payoutAmount: 200, affiliateLink: 'https://example-broker.com/lemon' },
    { title: 'Upstox Demat Account', category: ProductCategory.DEMAT_ACCOUNT, payoutAmount: 200, affiliateLink: 'https://example-broker.com/upstox' },
    { title: 'Angel One Demat Account', category: ProductCategory.DEMAT_ACCOUNT, payoutAmount: 150, affiliateLink: 'https://example-broker.com/angelone' },
    // Prepaid Card
    { title: 'Tide Business India', category: ProductCategory.PREPAID_CARD, payoutAmount: 300, affiliateLink: 'https://example-card.com/tide' },
    // Credit Cards
    { title: 'HDFC MoneyBack+', category: ProductCategory.CREDIT_CARD, payoutAmount: 600, affiliateLink: 'https://example-card.com/hdfc-moneyback' },
    { title: 'SBI SimplyCLICK', category: ProductCategory.CREDIT_CARD, payoutAmount: 500, affiliateLink: 'https://example-card.com/sbi-simplyclick' },
    // Loans
    { title: 'Personal Loan - Bajaj Finserv', category: ProductCategory.LOAN, subCategory: 'Personal Loan', payoutAmount: 1000, affiliateLink: 'https://example-loan.com/bajaj-personal' },
    { title: 'Business Loan - Lendingkart', category: ProductCategory.LOAN, subCategory: 'Business Loan', payoutAmount: 1500, affiliateLink: 'https://example-loan.com/lendingkart-business' },
    // Insurance
    { title: 'Term Life - Max Life', category: ProductCategory.INSURANCE, subCategory: 'Life/Term', payoutAmount: 800, affiliateLink: 'https://example-insurance.com/maxlife-term' },
    { title: 'Health Insurance - Star Health', category: ProductCategory.INSURANCE, subCategory: 'Health', payoutAmount: 600, affiliateLink: 'https://example-insurance.com/starhealth' },
    // FASTag
    { title: 'ICICI FASTag', category: ProductCategory.FASTAG, payoutAmount: 100, affiliateLink: 'https://example-fastag.com/icici' },
  ];

  for (const p of products) {
    const exists = await prisma.product.findFirst({ where: { title: p.title } });
    if (!exists) {
      await prisma.product.create({ data: p });
    }
  }

  console.log('Seeding app settings...');
  const existingSettings = await prisma.appSettings.findFirst();
  if (!existingSettings) {
    await prisma.appSettings.create({ data: {} });
  }

  console.log('Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
