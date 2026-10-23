from types import SimpleNamespace

import pytest

from scripts import check_runtime_dependencies as runtime


def test_check_imports_real_modules_even_when_metadata_may_exist():
    visited = []

    def importer(name):
        visited.append(name)
        if name == "anyio":
            raise ModuleNotFoundError("No module named 'anyio'")

    errors = runtime.runtime_errors(importer)
    assert visited == list(runtime.RUNTIME_MODULES)
    assert errors == [("anyio", "ModuleNotFoundError: No module named 'anyio'")]


def test_binary_import_failure_is_also_an_unhealthy_environment():
    def importer(name):
        if name == "numpy":
            raise OSError("missing binary")

    assert runtime.runtime_errors(importer) == [("numpy", "OSError: missing binary")]


def test_healthy_imports_return_no_errors():
    assert runtime.runtime_errors(lambda name: None) == []


def test_repair_reuses_versions_and_does_not_reinstall_pip_or_resolve_new_versions():
    distributions = [
        SimpleNamespace(metadata={"Name": "anyio"}, version="4.14.2"),
        SimpleNamespace(metadata={"Name": "PyJWT"}, version="2.15.1"),
        SimpleNamespace(metadata={"Name": "pip"}, version="26.2.1"),
        SimpleNamespace(metadata={}, version="0"),
    ]
    command = runtime.repair_command(distributions)
    assert command[-2:] == ["PyJWT==2.15.1", "anyio==4.14.2"]
    assert "--force-reinstall" in command
    assert "--no-deps" in command
    assert "--upgrade" not in command
    assert not any(spec.startswith("pip==") for spec in command)


def test_repair_without_package_metadata_fails_explicitly():
    with pytest.raises(RuntimeError, match="找不到可修復"):
        runtime.repair_command([])


@pytest.mark.parametrize("errors, expected", [([], 0), ([("anyio", "missing source")], 1)])
def test_check_exit_status_does_not_mark_broken_runtime_as_healthy(monkeypatch, capsys, errors, expected):
    monkeypatch.setattr(runtime, "runtime_errors", lambda: errors)
    monkeypatch.setattr(runtime.subprocess, "run", lambda *args, **kwargs: pytest.fail("check must not install packages"))
    assert runtime.main([]) == expected
    assert ("anyio: missing source" in capsys.readouterr().err) == bool(errors)


def test_repair_preserves_failure_status_so_startup_cannot_record_success(monkeypatch):
    monkeypatch.setattr(runtime.metadata, "distributions", lambda: [
        SimpleNamespace(metadata={"Name": "anyio"}, version="4.14.2")
    ])
    calls = []

    def run(command, **kwargs):
        calls.append(command)
        return SimpleNamespace(returncode=23)

    monkeypatch.setattr(runtime.subprocess, "run", run)
    assert runtime.main(["--repair"]) == 23
    assert calls[0][-1] == "anyio==4.14.2"
