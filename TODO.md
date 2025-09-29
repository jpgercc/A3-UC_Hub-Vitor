# TODO List for System Modifications

## 1. Unify User Registration Form
- [ ] Remove separate tutor and vet registration forms from login screen
- [ ] Create unified registration form with checkbox "É médico?"
- [ ] Show CRMV field only when checkbox is checked
- [ ] Update form submission to handle both types

## 2. Update Backend for Unified Registration
- [ ] Add new route /api/cadastrar-usuario in server.js
- [ ] Handle saving to usuarios.json or medicos.json based on checkbox
- [ ] Update validation logic

## 3. Add Observation Field to Pet Registration
- [ ] Add observation textarea to pet form in tutor dashboard
- [ ] Update pet save API to include observation field

## 4. Modify Interface for Receptionist
- [ ] Add "Cadastrar Usuário" button to vet dashboard
- [ ] Move pet registration to vet dashboard (receptionist interface)
- [ ] Ensure same interface for doctors and receptionist

## 5. Testing
- [ ] Test unified user registration for tutors and vets
- [ ] Test pet registration with observation
- [ ] Verify login and dashboards work correctly
