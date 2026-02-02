-- Create a table for public users if not exists (though it should be in schema)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    credits INTEGER DEFAULT 0 NOT NULL,
    tier VARCHAR(50) DEFAULT 'free' NOT NULL
);

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, credits, tier)
    VALUES (NEW.id, 0, 'free')
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the function on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Seed existing users
INSERT INTO public.users (id, credits, tier)
SELECT id, 0, 'free'
FROM auth.users
ON CONFLICT (id) DO NOTHING;
