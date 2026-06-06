export const UniqueIndex = {
    User: {
        email: {
            key: 'unique_user_email_index',
            error: 'Já existe user com o mesmo email'
        }
    },
};
