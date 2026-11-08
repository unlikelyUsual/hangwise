class DemoPersona {
  const DemoPersona({
    required this.id,
    required this.label,
    required this.role,
    required this.description,
  });

  final String id;
  final String label;
  final String role;
  final String description;

  static const alex = DemoPersona(
    id: '11111111-1111-4111-8111-111111111111',
    label: 'Alex Demo',
    role: 'customer',
    description: 'Fictional customer',
  );
  static const priya = DemoPersona(
    id: '11111111-1111-4111-8111-111111111112',
    label: 'Priya Demo',
    role: 'customer',
    description: 'Fictional customer',
  );
  static const maya = DemoPersona(
    id: '22222222-2222-4222-8222-222222222221',
    label: 'Maya Srisai',
    role: 'companion',
    description: 'Fictional companion',
  );
  static const arun = DemoPersona(
    id: '22222222-2222-4222-8222-222222222222',
    label: 'Arun Desai',
    role: 'companion',
    description: 'Fictional companion',
  );
  static const lena = DemoPersona(
    id: '22222222-2222-4222-8222-222222222223',
    label: 'Lena Moretti',
    role: 'companion',
    description: 'Fictional companion',
  );
  static const kenji = DemoPersona(
    id: '22222222-2222-4222-8222-222222222224',
    label: 'Kenji Aoki',
    role: 'companion',
    description: 'Fictional companion',
  );
  static const admin = DemoPersona(
    id: '33333333-3333-4333-8333-333333333333',
    label: 'Admin Demo',
    role: 'admin',
    description: 'Fictional admin',
  );

  static const all = <DemoPersona>[alex, priya, maya, arun, lena, kenji, admin];
}
