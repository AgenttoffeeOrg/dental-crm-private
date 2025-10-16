import { createServiceClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const supabase = createServiceClient()
    
    console.log('Starting realistic practice data creation...')
    
    const tenantId = process.env.TEST_TENANT_ID || (await getFirstTenantId())
    
    // Create patients one by one to avoid complex SQL
    const patients = [
      {
        id: '550e8400-e29b-41d4-a716-446655440100',
        full_name: 'Dr. James Mitchell',
        primary_email: 'james.mitchell@email.com',
        primary_phone: '+44 7700 900100',
        date_of_birth: '1975-03-15',
        address: '45 Harley Street, London W1G 8QQ',
        lead_score: 95,
        tags: ['VIP', 'Referral Source', 'Implants'],
        created_at: '2023-01-15 10:00:00+00'
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440101',
        full_name: 'Sarah Thompson-Clarke',
        primary_email: 'sarah.clarke@business.co.uk',
        primary_phone: '+44 7700 900101',
        date_of_birth: '1982-07-22',
        address: '12 Chelsea Square, London SW3 6LF',
        lead_score: 92,
        tags: ['Cosmetic', 'High Value', 'Orthodontics'],
        created_at: '2023-02-10 14:30:00+00'
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440102',
        full_name: 'Robert Chen',
        primary_email: 'r.chen@techcorp.com',
        primary_phone: '+44 7700 900102',
        date_of_birth: '1978-11-08',
        address: '88 Canary Wharf, London E14 5AB',
        lead_score: 89,
        tags: ['Executive', 'Implants', 'Cosmetic'],
        created_at: '2023-01-20 09:15:00+00'
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440103',
        full_name: 'Emma Richardson',
        primary_email: 'emma.richardson@gmail.com',
        primary_phone: '+44 7700 900103',
        date_of_birth: '1985-05-14',
        address: '23 Richmond Hill, Surrey TW10 6QX',
        lead_score: 78,
        tags: ['Family', 'Hygiene', 'Fillings'],
        created_at: '2023-03-05 11:20:00+00'
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440104',
        full_name: 'Michael O\'Connor',
        primary_email: 'moc.fitness@outlook.com',
        primary_phone: '+44 7700 900104',
        date_of_birth: '1990-09-30',
        address: '67 Clapham Common, London SW4 9DA',
        lead_score: 82,
        tags: ['Sports', 'Emergency', 'Whitening'],
        created_at: '2023-02-28 16:45:00+00'
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440105',
        full_name: 'Lisa Patel',
        primary_email: 'lisa.patel@lawfirm.co.uk',
        primary_phone: '+44 7700 900105',
        date_of_birth: '1987-12-03',
        address: '156 Hampstead Heath, London NW3 2HP',
        lead_score: 85,
        tags: ['Professional', 'Invisalign', 'Hygiene'],
        created_at: '2023-01-30 13:10:00+00'
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440106',
        full_name: 'Oliver Jackson',
        primary_email: 'oliver.jackson@startup.io',
        primary_phone: '+44 7700 900106',
        date_of_birth: '1992-01-12',
        address: '78 Shoreditch High Street, London E1 6JJ',
        lead_score: 65,
        tags: ['Tech', 'Young Professional'],
        created_at: '2024-01-15 10:45:00+00'
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440107',
        full_name: 'Sophie Martinez',
        primary_email: 'sophie.martinez@university.ac.uk',
        primary_phone: '+44 7700 900107',
        date_of_birth: '1995-06-07',
        address: '145 Bloomsbury Way, London WC1A 2TH',
        lead_score: 58,
        tags: ['Student', 'Budget Conscious'],
        created_at: '2024-02-01 14:15:00+00'
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440108',
        full_name: 'Thomas Anderson',
        primary_email: 'thomas.anderson@finance.com',
        primary_phone: '+44 7700 900108',
        date_of_birth: '1988-10-14',
        address: '203 City Road, London EC1V 1JN',
        lead_score: 73,
        tags: ['Finance', 'Whitening'],
        created_at: '2024-01-20 09:30:00+00'
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440109',
        full_name: 'Rachel Green',
        primary_email: 'rachel.green@design.studio',
        primary_phone: '+44 7700 900109',
        date_of_birth: '1991-03-28',
        address: '56 King\'s Road, Chelsea SW3 4UD',
        lead_score: 69,
        tags: ['Creative', 'Aesthetic'],
        created_at: '2024-02-10 11:00:00+00'
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440110',
        full_name: 'Jennifer Wilson',
        primary_email: 'jenny.wilson@family.com',
        primary_phone: '+44 7700 900110',
        date_of_birth: '1979-11-11',
        address: '42 Putney Bridge Road, London SW15 2NQ',
        lead_score: 72,
        tags: ['Family', 'Mother', 'Hygiene'],
        created_at: '2023-06-15 10:15:00+00'
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440111',
        full_name: 'Mark Wilson',
        primary_email: 'mark.wilson@family.com',
        primary_phone: '+44 7700 900111',
        date_of_birth: '1977-09-05',
        address: '42 Putney Bridge Road, London SW15 2NQ',
        lead_score: 68,
        tags: ['Family', 'Father', 'Crowns'],
        created_at: '2023-06-15 10:15:00+00'
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440112',
        full_name: 'Margaret Davies',
        primary_email: 'margaret.davies@retired.com',
        primary_phone: '+44 7700 900112',
        date_of_birth: '1955-04-30',
        address: '78 Wimbledon Village, London SW19 5AQ',
        lead_score: 83,
        tags: ['Senior', 'Dentures', 'Regular'],
        created_at: '2022-08-20 14:00:00+00'
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440113',
        full_name: 'Yuki Tanaka',
        primary_email: 'yuki.tanaka@japanese.co.jp',
        primary_phone: '+44 7700 900113',
        date_of_birth: '1984-08-17',
        address: '67 South Kensington, London SW7 2EU',
        lead_score: 87,
        tags: ['International', 'Executive', 'Cosmetic'],
        created_at: '2023-11-15 12:20:00+00'
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440114',
        full_name: 'Isabella Rodriguez',
        primary_email: 'isabella.rodriguez@fashion.com',
        primary_phone: '+44 7700 900114',
        date_of_birth: '1993-09-18',
        address: '45 Bond Street, London W1S 4AQ',
        lead_score: 86,
        tags: ['Fashion', 'Cosmetic', 'Veneers'],
        created_at: '2023-12-10 13:45:00+00'
      }
    ]
    
    let createdCount = 0
    
    for (const patient of patients) {
      const { error } = await supabase
        .from('contacts')
        .insert([{
          ...patient,
          tenant_id: tenantId,
          status: 'active'
        }])
      
      if (error && !error.message.includes('duplicate key')) {
        console.error('Error creating patient:', patient.full_name, error)
      } else {
        createdCount++
      }
    }
    
    console.log(`✅ Created ${createdCount} realistic patients`)
    
    return NextResponse.json({ 
      success: true, 
      message: `Created ${createdCount} realistic patients. Run /api/test/create-deals next to add deals.` 
    })
    
  } catch (error) {
    console.error('Error in create-realistic-data:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}
