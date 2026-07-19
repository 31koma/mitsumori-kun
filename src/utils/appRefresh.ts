export const refreshApp = async () => {
    if (window.mitsumoriDesktop?.updateApp) {
        const result = await window.mitsumoriDesktop.updateApp();
        if (!result.ok) {
            alert(`更新に失敗しました。\n${result.message}`);
        }
        return;
    }

    if (window.mitsumoriDesktop?.reloadApp) {
        await window.mitsumoriDesktop.reloadApp();
        return;
    }

    window.location.reload();
};
